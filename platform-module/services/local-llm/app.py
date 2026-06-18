from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.llms import HuggingFacePipeline



CHAT_MODEL = os.getenv("LOCAL_CHAT_MODEL", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
EMBED_MODEL = os.getenv(
    "LOCAL_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
# When run from services/local-llm/, use local dirs
VECTOR_DIR = os.getenv("LOCAL_VECTOR_DIR", "chroma")
CHUNK_SIZE = int(os.getenv("LOCAL_CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("LOCAL_CHUNK_OVERLAP", "200"))
RAW_DIR = os.getenv("LOCAL_RAW_DIR", "rag_raw")

app = FastAPI()


class IngestRequest(BaseModel):
    files: List[str]


class DraftSectionRequest(BaseModel):
    section: str
    requirements: str
    top_k: int = 6
    temperature: float = 0.2


def build_prompt(requirements: str, context: str, section: str) -> str:
    return (
        "You are drafting a prospectus section. Follow the requirements exactly. "
        "Use only the provided context. Output only the section content.\n"
        "Return ONLY between <<<SECTION_START>>> and <<<SECTION_END>>>.\n\n"
        f"Section: {section}\n\n"
        f"Requirements:\n{requirements}\n\n"
        f"Context:\n{context}\n\n"
        # "Return only:\n<<<SECTION_START>>>\n<<<SECTION_END>>>"
    )


def extract_section(text: str) -> str:
    start = text.rfind("<<<SECTION_START>>>")
    end = text.rfind("<<<SECTION_END>>>")
    if start != -1 and end != -1 and end > start:
        content = text[start + len("<<<SECTION_START>>>") : end].strip()
        if content == "<SECTION_CONTENT>":
            return ""
        return content
    return text.strip()


def safe_name(input: str) -> str:
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in input)


def save_raw(section: str, content: str) -> None:
    try:
        os.makedirs(RAW_DIR, exist_ok=True)
        stamp = (
            __import__("datetime")
            .datetime.utcnow()
            .isoformat()
            .replace(":", "-")
            .replace(".", "-")
        )
        filename = f"{stamp}__{safe_name(section)}__local.txt"
        with open(os.path.join(RAW_DIR, filename), "w", encoding="utf-8") as f:
            f.write(content or "")
    except Exception:
        pass


def load_documents(paths: List[str]):
    docs = []
    for p in paths:
        lower = p.lower()
        if lower.endswith(".pdf"):
            loader = PyPDFLoader(p)
        elif lower.endswith(".docx"):
            loader = Docx2txtLoader(p)
        else:
            continue
        docs.extend(loader.load())
    return docs


embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
)

tokenizer = AutoTokenizer.from_pretrained(CHAT_MODEL)
model = AutoModelForCausalLM.from_pretrained(CHAT_MODEL)
gen_pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens=512,
    do_sample=True,
    temperature=0.2,
)
llm = HuggingFacePipeline(pipeline=gen_pipe)


def get_vectorstore():
    return Chroma(persist_directory=VECTOR_DIR, embedding_function=embeddings)


@app.post("/ingest")
def ingest(req: IngestRequest):
    docs = load_documents(req.files)
    if not docs:
        return {"ingested": 0}
    chunks = text_splitter.split_documents(docs)
    store = get_vectorstore()
    store.add_documents(chunks)
    store.persist()
    return {"ingested": len(chunks)}


@app.post("/draft_section")
def draft_section(req: DraftSectionRequest):
    store = get_vectorstore()
    retriever = store.as_retriever(search_kwargs={"k": req.top_k})
    query = f"{req.section}\n{req.requirements}"
    docs = retriever.invoke(query)
    context = "\n\n".join([d.page_content for d in docs])
    prompt = build_prompt(req.requirements, context, req.section)
    text = llm.invoke(prompt)
    save_raw(req.section, text)
    # Some pipelines echo the prompt; prefer the last occurrence.
    if prompt in text:
        text = text.split(prompt)[-1].strip()
    text = extract_section(text)
    return {"text": text}
