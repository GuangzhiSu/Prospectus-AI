import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

const KG_DATA_JSON = `{"totals": {"nodes": 4250, "edges": 16301, "section_types": 31, "documents": 125, "section_instances": 4094, "edge_types": {"typically_precedes": 44, "has_child_instance": 4094, "appears_in": 4094, "instance_of": 4094, "followed_by_instance": 3975}}, "nodes": [{"id": "Cover", "name": "Cover", "mandatory": true, "order": 0, "instance_count": 119, "function": "To introduce the issuer, listing details, and key underwriters of the global offering.", "purpose": "HKEX requires the Cover section to provide essential information about the issuer, including its corporate structure, stock code, and key underwriters involved in the global offering. This section serves as the opening page of the prospectus, giving investors their first glimpse into the offering and the entities involved.", "subsections": ["Global Offering", "Stock Code", "Issuer Name", "Corporate Structure", "Key Underwriters"], "writing_rules": ["Use clear and concise language.", "Ensure all names are spelled correctly in both English and Chinese.", "List key underwriters in the order specified by HKEX guidelines.", "Include the stock code prominently at the top of the section.", "Provide accurate and up-to-date information."], "required_inputs": ["stock_code", "issuer_name_en", "issuer_name_ch", "corporate_structure", "key_underwriters"], "pitfalls": ["Incorrect spelling of the issuer’s name in either language.", "Omitting the stock code or placing it in an inconspicuous location.", "Failing to list all required key underwriters in the correct order.", "Providing outdated or incorrect information about the issuer’s corporate structure."]}, {"id": "Important_Notice", "name": "Important", "mandatory": true, "order": 1, "instance_count": 121, "function": "To inform potential investors about the importance of seeking independent professional advice if they have doubts about the prospectus content.", "purpose": "HKEX requires this section to ensure that investors are fully aware of the risks and complexities involved in investing in the company and to encourage them to seek professional advice. This section also disclaims liability for the accuracy of the prospectus and highlights important terms and conditions of the offering.", "subsections": ["Disclaimer of Liability", "Application Details", "Important Terms and Conditions", "Regulatory Information"], "writing_rules": ["Use clear and concise language.", "Ensure all disclaimers are accurate and comply with HKEX regulations.", "Cross-reference important terms and conditions with relevant sections of the prospectus.", "Maintain a formal tone throughout the section.", "Include all necessary information as required by HKEX guidelines."], "required_inputs": ["issuer_name", "stock_code", "number_of_hk_offershares", "maximum_offer_price", "minimum_application_amount", "price_determination_date"], "pitfalls": ["Failing to include all necessary disclaimers and warnings.", "Providing inaccurate or outdated information about the offer.", "Omitting important terms and conditions that affect investor rights.", "Not cross-referencing with other sections of the prospectus."]}, {"id": "Expected_Timetable", "name": "Expected Timetable", "mandatory": true, "order": 2, "instance_count": 119, "function": "To outline the schedule of key events in the Hong Kong Public Offering.", "purpose": "HKEX requires this section to ensure transparency and clarity regarding the timeline of the offering process, allowing investors to plan accordingly. Regulators and investors expect to understand when critical steps occur, such as the start and end of the application period, price determination, and the release of allocation results.", "subsections": ["Commencement of Hong Kong Public Offering", "Deadline for Electronic Applications", "Opening of Application Lists", "Deadline for Payment and Instructions", "Closing of Application Lists", "Price Determination Date", "Announcement of Offer Price and Other Details", "Results of Allocations"], "writing_rules": ["Use clear and precise language.", "Ensure all times and dates are accurate and consistent.", "Cross-reference with other sections such as 'Structure of the Global Offering' and 'How to Apply for Hong Kong Offer Shares'.", "Include any changes to the timetable in subsequent announcements.", "Adhere to the format and style guidelines provided by HKEX."], "required_inputs": ["commencement_date", "deadline_for_electronic_applications", "opening_of_application_lists", "deadline_for_payment_and_instructions", "closing_of_application_lists", "price_determination_date", "announcement_of_offer_price", "results_of_allocations"], "pitfalls": ["Inconsistent or incorrect dates and times.", "Failing to update the timetable if changes occur.", "Omitting important steps in the process.", "Not providing sufficient detail for each step."]}, {"id": "Contents", "name": "Contents", "mandatory": true, "order": 3, "instance_count": 119, "function": "To outline the organization of the prospectus and guide readers to the relevant sections.", "purpose": "HKEX requires this section to ensure transparency and ease of navigation for investors. It serves as a roadmap, allowing readers to quickly find the information they need regarding the offering, including important disclaimers, key financial details, and other critical sections like future plans and use of proceeds.", "subsections": ["Important Notice to Prospective Investors", "Expected Timetable", "Summary", "Definitions", "History, Reorganization and Corporate Structure", "Business", "Financial Information", "Relationship with Controlling Shareholders"], "writing_rules": ["Use clear and concise language.", "Ensure all disclaimers and legal notices are accurate and up-to-date.", "Cross-reference important information within the prospectus.", "Maintain a consistent format and style throughout the document.", "Avoid using technical jargon unless necessary and define it clearly."], "required_inputs": ["expected_timetable", "summary", "financial_information", "future_plans_and_use_of_proceeds", "cornerstone_investors", "underwriting", "structure_of_the_global_offering", "how_to_apply_for_hong_kong_offer_shares"], "pitfalls": ["Failing to include all required disclaimers and legal notices.", "Inconsistent formatting and style throughout the document.", "Omitting important financial information or misrepresenting data.", "Neglecting to update information that is outdated or incorrect."]}, {"id": "Summary", "name": "Summary", "mandatory": true, "order": 4, "instance_count": 119, "function": "To provide a high-level overview of the key aspects of the issuer and the offering, ensuring investors understand the core business, risks, and use of proceeds.", "purpose": "HKEX requires the Summary section to ensure that investors have a clear understanding of the key aspects of the issuer and the offering without delving into detailed technical or financial information. This helps investors make informed decisions and ensures transparency and fairness in the IPO process.", "subsections": ["Overview", "Business Overview", "Risk Factors", "Use of Proceeds", "Key Financial Highlights"], "writing_rules": ["Use clear and concise language.", "Avoid technical jargon and overly complex sentences.", "Provide factual information and avoid subjective opinions.", "Cross-reference to other sections of the prospectus where appropriate.", "Ensure consistency with the information provided in other sections of the prospectus."], "required_inputs": ["Issuer Name", "Business Overview", "Market Position", "Risk Factors", "Use of Proceeds", "Financial Highlights"], "pitfalls": ["Overgeneralizing or oversimplifying the business and risks.", "Failing to cross-reference to other sections of the prospectus.", "Including outdated or incorrect financial information.", "Neglecting to highlight key risks that could impact the investment."]}, {"id": "Definitions", "name": "Definitions", "mandatory": true, "order": 5, "instance_count": 119, "function": "To define key terms and acronyms used throughout the prospectus to ensure clarity and consistency.", "purpose": "HKEX requires this section to ensure that all terms and acronyms used in the prospectus are clearly defined to prevent ambiguity and ensure that investors and regulators understand the precise meanings of these terms. This section helps maintain transparency and facilitates a smooth reading experience for the audience.", "subsections": ["Term Definitions", "Cross-References", "Rounding Notes", "Language Notes"], "writing_rules": ["Use clear and concise language.", "Define terms consistently throughout the document.", "Cross-reference to glossary or other relevant sections.", "Include rounding notes if applicable.", "Use consistent formatting for all definitions.", "Ensure all acronyms are expanded on first use."], "required_inputs": ["Term", "Definition", "Acronym", "Full Name", "Rounding Note", "Cross-Reference"], "pitfalls": ["Failing to define terms consistently throughout the document.", "Overlooking rounding notes and their impact on figures.", "Not providing cross-references to other relevant sections.", "Using inconsistent formatting for definitions."]}, {"id": "Glossary_of_Technical_Terms", "name": "Glossary of Technical Terms", "mandatory": true, "order": 6, "instance_count": 115, "function": "To define and explain technical terms used throughout the prospectus to ensure clarity and consistency.", "purpose": "HKEX requires this section to ensure that all technical terms used in the prospectus are clearly defined and consistent with the issuer's intended meaning. This helps investors and regulators understand the issuer's business and technology accurately, reducing ambiguity and potential misinterpretation.", "subsections": ["Definition of Technical Terms", "Examples and Context", "Cross-References"], "writing_rules": ["Use clear and concise language.", "Define terms consistently with industry standards when possible.", "Avoid overly technical jargon unless necessary.", "Include cross-references to related terms or sections.", "Ensure definitions align with the issuer's intended meaning."], "required_inputs": ["term", "definition", "context", "cross_reference"], "pitfalls": ["Overuse of technical jargon without clear definitions.", "Inconsistent definitions across the prospectus.", "Lack of cross-references to related terms or sections.", "Failure to update definitions if the meaning changes post-filing."]}, {"id": "Forward_Looking_Statements", "name": "Forward-Looking Statements", "mandatory": true, "order": 7, "instance_count": 117, "function": "To disclose potential risks and uncertainties associated with forward-looking statements in the prospectus.", "purpose": "HKEX requires this section to ensure transparency and protect investors by clearly identifying statements that are speculative in nature. It helps prevent misinterpretation of the company's future expectations and aligns with regulatory standards for disclosure practices.", "subsections": ["Identification of Forward-Looking Statements", "Risks and Uncertainties", "Cautionary Statements", "Obligation to Update"], "writing_rules": ["Use clear and concise language.", "Identify forward-looking statements using specific phrases like 'believe', 'expect', 'anticipate', etc.", "List all forward-looking statements comprehensively.", "Provide a detailed discussion of risks and uncertainties.", "Include a disclaimer to caution against relying on forward-looking statements.", "State the company's obligation (or lack thereof) to update forward-looking statements."], "required_inputs": ["forward-looking_statements", "risks_and_uncertainties", "disclaimer"], "pitfalls": ["Failing to identify all forward-looking statements.", "Overstating the certainty of forward-looking statements.", "Neglecting to discuss significant risks and uncertainties.", "Not providing a clear disclaimer."]}, {"id": "Risk_Factors", "name": "Risk Factors", "mandatory": true, "order": 8, "instance_count": 119, "function": "To disclose material risks that could impact the issuer's business, financial condition, and results of operations, thereby enabling investors to make informed decisions.", "purpose": "HKEX requires this section to ensure transparency and full disclosure of potential risks that could affect the issuer's business. This helps protect investors by providing them with comprehensive information about the risks associated with investing in the company's securities, ensuring they can make informed investment decisions based on a thorough understanding of the risks involved.", "subsections": ["Introduction", "Industry Risks", "Operational Risks", "Financial Risks", "Regulatory Risks", "Market Risks", "Other Risks"], "writing_rules": ["Use clear and concise language.", "Avoid vague or overly general statements.", "Provide specific examples to illustrate risks.", "Cross-reference relevant sections of the prospectus where appropriate.", "Disclose all material risks, even if they are unlikely to occur.", "Update the section with the latest information available."], "required_inputs": ["issuer_name", "latest_practicable_date", "industry_risks", "operational_risks", "financial_risks", "regulatory_risks", "market_risks", "other_material_risks"], "pitfalls": ["Failing to disclose all material risks, even if they are unlikely to occur.", "Using overly general or vague language to describe risks.", "Not updating the section with the latest information available.", "Failing to cross-reference relevant sections of the prospectus."]}, {"id": "Prospectus_and_Global_Offering_Information", "name": "Information about this Prospectus and the Global Offering", "mandatory": false, "order": 10, "instance_count": 111, "function": "To detail the responsibilities of the directors, the structure and conditions of the global offering, and to ensure the accuracy and completeness of the prospectus.", "purpose": "HKEX requires this section to ensure transparency and accuracy in the prospectus, providing investors with critical information about the offering, the roles of various parties involved, and the conditions under which the shares will be offered. This section also clarifies the legal and regulatory compliance of the offering and addresses potential tax implications and exchange rate conversions.", "subsections": ["Directors’ Responsibility for the Contents of this Prospectus", "Information on the Global Offering, Structure and Conditions of the Global Offering and Procedures for Application for Hong Kong Offer Shares", "Exchange Rate Conversion", "Language", "Rounding", "Over-Allotment and Stabilization"], "writing_rules": ["Use clear and concise language.", "Ensure all information is accurate and complete.", "Cross-reference with other sections of the prospectus where appropriate.", "Adhere to the Companies (Winding Up and Miscellaneous Provisions) Ordinance, the Securities and Futures (Stock Market Listing) Rules, and the Listing Rules.", "Include translations for amounts denominated in different currencies.", "Specify the precedence of the English version in case of inconsistencies with the Chinese translation."], "required_inputs": ["directors_responsibility_statement", "number_of_hong_kong_offer_shares", "number_of_international_offer_shares", "underwriting_agreement_details", "exchange_rate_conversions", "language_precedence"], "pitfalls": ["Failing to accurately represent the directors' responsibility for the contents of the prospectus.", "Omitting important information about the global offering structure and conditions.", "Incorrect exchange rate conversions.", "Inconsistencies between the English and Chinese versions of the prospectus."]}, {"id": "Waivers_and_Exemptions", "name": "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)", "mandatory": true, "order": 10, "instance_count": 132, "function": "To detail any waivers or exemptions obtained from the strict compliance with the Hong Kong Exchanges and Clearing Limited (HKEX) Listing Rules or other relevant ordinances.", "purpose": "HKEX requires this section to ensure transparency and to address any deviations from the standard requirements, providing investors with a clear understanding of the rationale behind these deviations. This section helps maintain market integrity and ensures that the issuer meets the necessary regulatory standards where possible.", "subsections": ["Waiver in Respect of Joint Company Secretaries", "Waiver in Relation to Management Presence in Hong Kong", "Waiver in Relation to Continuing Connected Transactions", "Other Specific Waivers"], "writing_rules": ["Use formal and precise language consistent with the Listing Rules and HKEX guidelines.", "Clearly state the specific rule or ordinance being waived or exempted.", "Provide detailed explanations for the necessity of the waiver or exemption.", "Include the date of application and the date of grant for each waiver or exemption.", "Cross-reference relevant sections of the prospectus for additional information."], "required_inputs": ["waiver_date", "waiver_rule", "waiver_reason", "waiver_expiration_date", "waiver_grantor"], "pitfalls": ["Failing to provide a clear and detailed explanation for the necessity of the waiver or exemption.", "Not including the date of application and grant for each waiver or exemption.", "Omitting cross-references to relevant sections of the prospectus.", "Not updating the waiver or exemption details if the situation changes post-listing."]}, {"id": "Parties_Involved_in_the_Global_Offering", "name": "Directors and Parties Involved in the Global Offering", "mandatory": true, "order": 11, "instance_count": 119, "function": "To disclose the key individuals and entities involved in the global offering process, including directors, parties involved, and their roles.", "purpose": "HKEX requires this section to ensure transparency and provide investors with comprehensive information about the management and advisory teams involved in the global offering. This helps investors understand the governance structure and the expertise behind the offering.", "subsections": ["Directors", "Supervisors", "Parties Involved in the Global Offering", "Legal Advisors", "Reporting Accountant and Independent Auditor", "Industry Consultant", "Receiving Banks"], "writing_rules": ["Use clear and concise language.", "Ensure all names and addresses are accurate and up-to-date.", "Cross-reference with other sections of the prospectus where relevant.", "Disclose the roles and responsibilities of each party involved.", "Adhere to the disclosure requirements set by HKEX."], "required_inputs": ["director_name", "director_address", "director_nationality", "director_role", "joint_sponsor_name", "joint_sponsor_address", "legal_advisor_name", "legal_advisor_address"], "pitfalls": ["Omitting or incorrectly listing the roles of directors and supervisors.", "Providing outdated or incorrect contact information.", "Failing to disclose the full scope of services provided by legal advisors.", "Not cross-referencing with other sections of the prospectus."]}, {"id": "Corporate_Information", "name": "Corporate Information", "mandatory": true, "order": 12, "instance_count": 117, "function": "To provide essential corporate details and governance information for potential investors.", "purpose": "HKEX requires this section to ensure transparency and provide investors with comprehensive information about the issuer's corporate structure, key personnel, and governance mechanisms. This helps investors make informed decisions and ensures compliance with regulatory standards.", "subsections": ["Registered Office", "Head Office and Principal Place of Business", "Company’s Website", "Joint Company Secretaries", "Authorized Representatives", "Audit Committee", "Remuneration and Evaluation Committee", "Nomination Committee"], "writing_rules": ["Use clear and concise language.", "Ensure all information is accurate and up-to-date.", "Cross-reference with other sections where relevant.", "Follow HKEX guidelines on disclosure requirements.", "Maintain consistent formatting and style throughout the section."], "required_inputs": ["registered_office_address", "head_office_address", "principal_place_of_business_hk", "company_website", "joint_company_secretaries", "authorized_representatives", "audit_committee_members", "remuneration_and_evaluation_committee_members"], "pitfalls": ["Omitting or providing outdated information.", "Failing to include all required committees and their members.", "Incorrect formatting or inconsistent style.", "Neglecting to update the information regularly."]}, {"id": "Industry_Overview", "name": "Industry Overview", "mandatory": true, "order": 13, "instance_count": 118, "function": "To provide an overview of the industry in which the issuer operates, including relevant market data, trends, and competitive landscape.", "purpose": "HKEX requires this section to ensure transparency and provide potential investors with a clear understanding of the industry dynamics, market size, growth prospects, and competitive environment. Regulators and investors expect to see reliable and up-to-date information that supports the issuer's business strategy and financial projections.", "subsections": ["Introduction", "Market Size and Growth", "Key Drivers and Challenges", "Competitive Landscape", "Regulatory Environment", "Technology Trends"], "writing_rules": ["Use clear and concise language.", "Avoid overly technical jargon unless necessary.", "Provide cross-references to other sections of the prospectus where relevant information is discussed.", "Ensure all data and statistics are accurate and up-to-date.", "Disclose any conflicts of interest related to the sources of information."], "required_inputs": ["industry_name", "market_size", "growth_rate", "projected_market_size", "key_drivers", "challenges", "major_competitors", "regulatory_environment"], "pitfalls": ["Inaccurate or outdated data", "Lack of cross-referencing to other sections", "Failure to disclose conflicts of interest", "Over-reliance on a single source of information"]}, {"id": "Regulatory_Overview", "name": "Regulation (Regulatory Overview)", "mandatory": true, "order": 14, "instance_count": 119, "function": "To summarize the key regulatory frameworks affecting the issuer's business in the PRC.", "purpose": "HKEX requires this section to ensure that potential investors have a clear understanding of the regulatory environment in which the issuer operates, particularly focusing on PRC laws and regulations that significantly impact the issuer's business activities, financial performance, and compliance obligations.", "subsections": ["Regulations on Value-Added Telecommunications Services and Foreign Investment Restrictions", "Government Policies Related to the Issuer's Industry", "Product Liability and Consumer Protection", "Cross-Border Transactions and Foreign Exchange Regulations", "Intellectual Property and Data Security"], "writing_rules": ["Use clear and concise language.", "Ensure all references to laws and regulations are up-to-date.", "Provide specific examples where applicable.", "Cross-reference with other sections of the prospectus as necessary.", "Maintain a neutral tone and avoid promotional language."], "required_inputs": ["latest_negative_list", "encouraged_industries_catalog", "government_policies", "product_liability_laws", "cross_border_transaction_regulations"], "pitfalls": ["Failing to update references to outdated laws and regulations.", "Omitting critical regulatory requirements that could impact the issuer's business.", "Providing vague or overly general descriptions of regulations.", "Neglecting to include relevant government policies that support the issuer's industry."]}, {"id": "History_Reorganization_Corporate_Structure", "name": "History, Reorganization, and Corporate Structure", "mandatory": true, "order": 15, "instance_count": 119, "function": "To provide a detailed account of the issuer's history, key milestones, reorganizations, and corporate structure, ensuring transparency and aiding investor understanding.", "purpose": "HKEX requires this section to ensure that investors have a clear understanding of the issuer's historical development, key achievements, and current corporate structure. This helps in assessing the issuer's stability, growth trajectory, and compliance with relevant regulations, particularly those related to cross-border investments and operations.", "subsections": ["Overview", "Key Milestones", "Corporate Structure", "Reorganizations", "Cross-Border Investments and Operations"], "writing_rules": ["Use clear and concise language.", "Ensure all dates and events are accurate and verifiable.", "Include relevant regulatory information, especially concerning cross-border investments.", "Cross-reference with other sections where appropriate.", "Maintain a consistent chronological order."], "required_inputs": ["Company_Incorporation_Date", "Key_Milestones", "Corporate_Structure", "Reorganizations", "Cross_Border_Operations"], "pitfalls": ["Omitting key milestones or reorganizations that could impact investor perception.", "Providing inaccurate or outdated information about the company's history and structure.", "Failing to disclose relevant regulatory requirements and compliance issues.", "Not maintaining a clear and chronological order in the presentation of information."]}, {"id": "Business", "name": "Business", "mandatory": true, "order": 16, "instance_count": 120, "function": "Provides an overview of the issuer's business, including its mission, vision, core competencies, market position, and competitive landscape.", "purpose": "HKEX requires this section to ensure transparency about the issuer's business operations, strategic direction, and competitive environment. Investors and regulators expect to understand the issuer's business model, market position, and how it plans to achieve its goals.", "subsections": ["Mission and Vision", "Business Overview", "Market Position", "Products and Services", "Business Model", "Competition", "Regulatory Environment", "Intellectual Property"], "writing_rules": ["Use clear and concise language.", "Avoid overly technical jargon unless necessary.", "Provide specific examples and data to support claims.", "Cross-reference with other sections of the prospectus as needed.", "Ensure consistency with the issuer's annual reports and other public filings."], "required_inputs": ["mission_statement", "vision_statement", "core_products_services", "market_position", "competitors", "regulatory_environment", "intellectual_property", "data_security_and_privacy"], "pitfalls": ["Overgeneralizing the business model without providing specific details.", "Failing to disclose material risks adequately.", "Using overly technical language that may confuse investors.", "Not providing sufficient context for the issuer's market position."]}, {"id": "Contractual_Arrangements_VIE", "name": "Contractual Arrangements (Variable Interest Entities)", "mandatory": false, "order": 17, "instance_count": 35, "function": "To disclose the contractual arrangements between the Variable Interest Entity (VIE) and the WFOE, detailing how these arrangements allow the WFOE to control the VIE and consolidate its financial results.", "purpose": "HKEX requires this section to ensure transparency regarding the complex ownership and control structures of the applicant, particularly when involving offshore entities and PRC regulations on foreign investment. This helps investors understand the true economic substance of the applicant’s operations and the risks associated with such structures.", "subsections": ["PRC Regulatory Background", "Description of Contractual Arrangements", "Control Mechanisms", "Accounting Aspects", "Impact and Potential Consequences of PRC Legislation"], "writing_rules": ["Use clear and concise language.", "Ensure all contractual agreements are accurately described and cross-referenced.", "Provide detailed explanations of control mechanisms and their legal basis.", "Disclose any potential risks and uncertainties related to the VIE structure.", "Refer to the latest PRC laws and regulations.", "Include a statement from the company’s directors on the fairness and reasonableness of the contractual arrangements."], "required_inputs": ["VIE_WFOE_name", "Relevant_businesses", "Control_mechanisms", "Consolidation_basis", "Legal_advisory_opinion"], "pitfalls": ["Failing to disclose all relevant control mechanisms and their legal basis.", "Overlooking the impact of recent PRC legislation on the VIE structure.", "Inaccurate descriptions of contractual agreements and their enforcement.", "Insufficient disclosure of risks and uncertainties related to the VIE structure."]}, {"id": "Connected_Transactions", "name": "Connected Transactions", "mandatory": false, "order": 18, "instance_count": 76, "function": "Discloses ongoing transactions between the issuer and its connected persons, ensuring transparency and compliance with HKEX regulations.", "purpose": "HKEX requires this section to ensure transparency regarding ongoing transactions between the issuer and its connected persons. This helps investors understand potential conflicts of interest and assess the fairness and reasonableness of these transactions. It also ensures compliance with the Listing Rules, particularly Chapter 14A, which governs connected transactions.", "subsections": ["Overview", "Connected Persons", "Transactions", "Waivers and Exemptions", "Review and Approval", "Future Amendments"], "writing_rules": ["Use clear and concise language.", "Ensure all transactions are accurately described and disclosed.", "Cross-reference with other sections of the prospectus as necessary.", "Adhere to the specific requirements of Chapter 14A of the Listing Rules.", "Include any relevant waivers or exemptions obtained from the Stock Exchange."], "required_inputs": ["connected_persons", "transaction_details", "waivers_and_exemptions", "review_process"], "pitfalls": ["Omitting important connected persons or transactions.", "Failing to disclose the full scope of transactions and their impact.", "Not obtaining necessary waivers or exemptions from the Stock Exchange.", "Lack of clarity in the description of transactions and their terms."]}, {"id": "Relationship_with_Controlling_Shareholders", "name": "Relationship with Our Controlling Shareholders", "mandatory": false, "order": 18, "instance_count": 115, "function": "To disclose the relationship between the company and its controlling shareholders, including their shareholdings, voting rights, and measures taken to manage conflicts of interest.", "purpose": "HKEX requires this section to ensure transparency regarding the influence of controlling shareholders on the company and to demonstrate that the company has adequate measures in place to protect minority shareholders' interests. This section helps investors understand the potential conflicts of interest and the steps taken to mitigate them.", "subsections": ["Controlling Shareholders", "Shareholding Structure", "Voting Rights", "Conflicts of Interest Management", "Disclosure of Connected Transactions"], "writing_rules": ["Use clear and concise language.", "Disclose all relevant information about shareholdings and voting rights.", "Cross-reference with other sections of the prospectus, such as the Share Capital section.", "Ensure consistency with the Listing Rules and the Code on Corporate Governance.", "Provide details of any concert party agreements or similar arrangements."], "required_inputs": ["controlling_shareholder_name", "controlling_shareholder_shareholding", "voting_rights_details", "concert_party_agreements", "internal_control_mechanisms"], "pitfalls": ["Omitting details of concert party agreements or similar arrangements.", "Failing to disclose all relevant information about shareholdings and voting rights.", "Not providing sufficient detail on internal control mechanisms.", "Inconsistent information across different sections of the prospectus."]}, {"id": "Directors_and_Senior_Management", "name": "Directors and Senior Management", "mandatory": false, "order": 19, "instance_count": 108, "function": "To provide details about the directors and senior management of the company, including their roles, responsibilities, and relationships.", "purpose": "HKEX requires this section to ensure transparency and accountability in corporate governance. Regulators and investors expect to understand the composition and dynamics of the board, the qualifications and experience of the directors, and the structure of senior management to assess the company's leadership and strategic direction.", "subsections": ["Directors", "Non-executive Directors", "Independent Non-executive Directors", "Remuneration Committee", "Remuneration Details", "Compliance Adviser"], "writing_rules": ["Use clear and concise language.", "Ensure all information is accurate and up-to-date.", "Disclose any conflicts of interest.", "Cross-reference with other sections of the prospectus, such as the remuneration section.", "Adhere to the format and structure specified by HKEX."], "required_inputs": ["director_name", "director_age", "director_position", "director_join_date", "director_appointment_date", "director_roles", "director_relationships", "remuneration_details"], "pitfalls": ["Failing to disclose conflicts of interest.", "Inaccurate or outdated information about directors and their roles.", "Lack of clarity in the description of roles and responsibilities.", "Failure to cross-reference with other sections of the prospectus."]}, {"id": "Substantial_Shareholders", "name": "Substantial Shareholders", "mandatory": true, "order": 20, "instance_count": 117, "function": "Discloses the identities and shareholdings of individuals or entities that hold 10% or more of the share capital of the company, providing transparency regarding significant ownership.", "purpose": "HKEX mandates this section to ensure transparency and disclosure of significant ownership stakes, aiding investors in understanding the potential influence of major shareholders and ensuring compliance with securities laws. This section helps prevent conflicts of interest and ensures that the public is informed about the distribution of ownership within the company.", "subsections": ["Name of substantial shareholder", "Capacity/nature of interest", "Number and class of shares held", "Approximate percentage of shareholding of each class of shares", "Approximate percentage of shareholding in the issued and outstanding share capital"], "writing_rules": ["Use clear and concise language.", "Ensure all information is accurate and up-to-date.", "Cross-reference with other sections where relevant.", "Follow the format and structure provided by HKEX guidelines.", "Include details on any changes in shareholdings due to the offering."], "required_inputs": ["name_of_substantial_shareholder", "capacity_nature_of_interest", "number_and_class_of_shares_held", "approximate_percentage_of_shareholding_of_each_class_of_shares", "approximate_percentage_of_shareholding_in_the_issued_and_outstanding_share_capital"], "pitfalls": ["Failing to update shareholding information accurately.", "Omitting relevant information about controlled corporations.", "Misrepresenting the nature of the interest held.", "Not cross-referencing with other sections of the prospectus."]}, {"id": "Share_Capital", "name": "Share Capital", "mandatory": true, "order": 21, "instance_count": 119, "function": "To describe the authorized and issued share capital of the company, including any changes due to the offering, and to detail the voting rights and repurchase mandates.", "purpose": "HKEX requires this section to ensure transparency and provide investors with a clear understanding of the company's share structure, including authorized and issued shares, voting rights, and any repurchase mandates. This helps investors assess the company's capital structure and potential dilution risks.", "subsections": ["Authorized Share Capital", "Issued, Fully Paid or Credited to be Fully Paid", "Share Capital Immediately Following Completion of the Offering", "Weighted Voting Rights Structure", "Repurchase Mandates"], "writing_rules": ["Use clear and concise language.", "Ensure all figures are accurate and up-to-date.", "Cross-reference with other sections of the prospectus where necessary.", "Adhere to the prescribed format and disclosure requirements.", "Include any relevant legal and regulatory information."], "required_inputs": ["authorized_share_capital", "issued_share_capital", "share_capital_after_offering", "voting_rights_structure", "repurchase_mandate_details"], "pitfalls": ["Inaccurate or outdated figures", "Failure to disclose all relevant share classes and their voting rights", "Omission of repurchase mandate details", "Insufficient cross-referencing with other sections of the prospectus"]}, {"id": "Cornerstone_Investors", "name": "Cornerstone Investors", "mandatory": false, "order": 22, "instance_count": 80, "function": "To detail the cornerstone investors' commitment to purchasing shares at the offering price and the conditions under which the cornerstone placing can proceed.", "purpose": "HKEX requires this section to ensure transparency regarding the cornerstone placing, which is a significant component of the global offering. Regulators and investors expect to understand the terms of the cornerstone investment agreements, the identities of the cornerstone investors, and the conditions precedent to the cornerstone placing. This section also outlines restrictions on the disposal of shares by the cornerstone investors, ensuring market stability post-listing.", "subsections": ["The Cornerstone Placing", "Conditions Precedent", "Restrictions on Disposals by the Cornerstone Investors"], "writing_rules": ["Use clear and concise language.", "Ensure all financial figures are accurate and up-to-date.", "Cross-reference with the financial statements and other sections of the prospectus.", "Adhere to the prescribed format and disclosure requirements of HKEX.", "Maintain a consistent tone throughout the section."], "required_inputs": ["cornerstone_investors_names", "cornerstone_investment_amounts", "cornerstone_investment_agreements", "lock_up_period", "conditions_precedent"], "pitfalls": ["Inaccurate or outdated financial figures.", "Failure to include all necessary conditions precedent.", "Insufficient detail on the lock-up period and restrictions on disposals.", "Lack of cross-referencing with other sections of the prospectus."]}, {"id": "Financial_Information", "name": "Financial Information", "mandatory": true, "order": 22, "instance_count": 119, "function": "To present the issuer's financial performance and position, along with relevant analysis and forward-looking statements.", "purpose": "HKEX requires this section to ensure transparency and provide investors with comprehensive financial information, enabling them to make informed investment decisions. It also helps regulators assess the financial health and stability of the issuer.", "subsections": ["Overview", "Business Model", "Consolidated Financial Statements", "Key Financial Ratios", "Management Discussion and Analysis (MD&A)", "Risk Factors", "Non-GAAP Measures", "Segment Analysis"], "writing_rules": ["Use clear and concise language.", "Ensure all forward-looking statements are accompanied by appropriate cautionary language.", "Cross-reference MD&A with the financial statements and notes.", "Adhere to HKFRS/GAAP reporting standards.", "Include a disclaimer for the limitations of forward-looking statements.", "Maintain consistency in terminology and financial metrics."], "required_inputs": ["issuer_name", "financial_years", "revenue", "net_income", "assets", "liabilities", "cash_flows", "key_ratios"], "pitfalls": ["Over-reliance on forward-looking statements without adequate disclosure of risks.", "Failure to reconcile non-GAAP measures with GAAP measures.", "Inconsistent use of financial metrics and terminology.", "Omission of critical accounting policies and estimates."]}, {"id": "Future_Plans_and_Use_of_Proceeds", "name": "Future Plans and Use of Proceeds", "mandatory": true, "order": 23, "instance_count": 119, "function": "Discloses how the company intends to use the proceeds from the offering and outlines the company's future plans.", "purpose": "HKEX requires this section to ensure transparency regarding the intended use of proceeds from the offering, allowing investors to assess the company's strategic direction and financial health. Regulators and investors expect to understand the company's future plans, the allocation of proceeds, and the rationale behind the proposed uses.", "subsections": ["Future Plans", "Use of Proceeds", "Pro Rata Adjustments", "Alternative Uses", "Short-Term Investments"], "writing_rules": ["Use clear and concise language.", "Provide specific percentages and amounts for each use of proceeds.", "Cross-reference with the business strategy section.", "Include a disclaimer about the pro rata adjustments if the actual net proceeds differ significantly from the estimated amount.", "State the company’s intention to use the proceeds for the stated purposes within a reasonable time frame.", "Ensure consistency with the financial statements and other sections of the prospectus."], "required_inputs": ["Offer_Price", "Net_Proceeds", "Percentage_Allocation", "Amount_Allocation", "Purpose_Description", "Pro_Rata_Adjustment_Policy"], "pitfalls": ["Failing to disclose pro rata adjustments if the actual net proceeds differ significantly from the estimated amount.", "Not providing a detailed breakdown of the use of proceeds.", "Lack of consistency between the use of proceeds and the financial projections.", "Omitting alternative uses of the proceeds if the primary plans do not materialize."]}, {"id": "Structure_of_the_Global_Offering", "name": "Structure of the Global Offering", "mandatory": true, "order": 25, "instance_count": 127, "function": "Describes the structure of the global offering, including the Hong Kong public offering and international placing, and the conditions for the offering to proceed.", "purpose": "HKEX requires this section to ensure transparency regarding the terms and conditions of the global offering, including the allocation of shares, the role of underwriters, and the conditions for the offering to proceed. This information is crucial for investors to understand the risks and opportunities associated with the offering.", "subsections": ["THE GLOBAL OFFERING", "THE HONG KONG PUBLIC OFFERING", "THE INTERNATIONAL OFFERING", "CONDITIONS FOR THE OFFERING TO PROCEED", "DEALING ARRANGEMENTS", "UNDERWRITING ARRANGEMENTS"], "writing_rules": ["Use clear and concise language.", "Ensure all conditions for the offering to proceed are clearly stated.", "Cross-reference relevant sections of the prospectus where appropriate.", "Disclose all material facts related to the offering.", "Adhere to the specific format and style guidelines provided by HKEX."], "required_inputs": ["joint_representatives", "number_of_hong_kong_shares", "number_of_international_shares", "price_determination_date", "over_allotment_option", "share_dealing_start_date"], "pitfalls": ["Failing to disclose all material conditions for the offering to proceed.", "Not accurately reflecting the terms of the underwriting agreements.", "Omitting important details about the international offering.", "Providing conflicting information across different sections of the prospectus."]}, {"id": "Underwriting", "name": "Underwriting", "mandatory": true, "order": 25, "instance_count": 119, "function": "To detail the underwriting arrangements for the Hong Kong Public Offering and International Offering, including the underwriters involved, the underwriting agreement, and the stabilizing activities.", "purpose": "HKEX requires this section to ensure transparency regarding the underwriting process, the roles of underwriters, and the potential impact of stabilizing activities on the market price of the shares. This information helps investors understand the risks associated with the offering and the mechanisms in place to manage them.", "subsections": ["Underwriting Arrangements and Expenses", "Stabilizing Activities", "Investment Banking Services"], "writing_rules": ["Use clear and concise language.", "Ensure all underwriting agreements are accurately reflected.", "Disclose any investment banking services provided by underwriters.", "Comply with the Market Misconduct Provisions of the Securities and Futures Ordinance (SFO).", "Cross-reference relevant sections of the prospectus where applicable."], "required_inputs": ["Underwriters", "Underwriting Agreement Date", "Offer Price", "Number of Offer Shares", "Over-allotment Option"], "pitfalls": ["Failing to disclose all underwriting services provided by underwriters.", "Not accurately reflecting the terms of the underwriting agreement.", "Ignoring the restrictions on stabilizing activities.", "Failing to cross-reference relevant sections of the prospectus."]}, {"id": "How_to_Apply_for_Hong_Kong_Offer_Shares", "name": "How to Apply for Hong Kong Offer Shares", "mandatory": true, "order": 27, "instance_count": 119, "function": "Describes the process for investors to apply for Hong Kong Offer Shares using an electronic application process.", "purpose": "HKEX requires this section to ensure transparency and standardization in the application process for Hong Kong Offer Shares, providing clear instructions to investors on how to participate in the offering. This section helps protect investor rights and ensures compliance with regulatory requirements.", "subsections": ["Important Notice to Investors", "Application Channels", "Application Procedures", "Notification of Results", "Confidentiality and Data Protection"], "writing_rules": ["Use clear and concise language.", "Mention all relevant application channels and procedures.", "Include contact information for inquiries and support.", "Ensure all dates and times are accurate and up-to-date.", "Cross-reference with other sections of the prospectus as needed."], "required_inputs": ["application_channels", "application_period_start_date", "application_period_end_date", "payment_deadline", "contact_information"], "pitfalls": ["Failing to update dates and times accurately.", "Omitting critical application channels or procedures.", "Neglecting to include confidentiality and data protection measures.", "Not providing sufficient contact information for inquiries."]}, {"id": "Appendices", "name": "Appendices", "mandatory": true, "order": 30, "instance_count": 701, "function": "To include additional reports, financial information, and other documents that support the main prospectus content.", "purpose": "HKEX requires appendices to ensure transparency and accuracy of financial information, to provide detailed explanations of accounting policies, and to include reports from independent auditors. This helps investors understand the company's financial health and compliance with regulatory standards.", "subsections": ["Accountant’s Report", "Unaudited Pro Forma Financial Information", "Other Supporting Documents"], "writing_rules": ["Must be prepared and addressed to the directors and sponsors as required by HKSIRO 200.", "Should be written in clear, concise, and formal language.", "Cross-reference to the main prospectus where necessary.", "Include all required disclosures as specified by HKEX regulations."], "required_inputs": ["Auditor’s Name", "Date of Report", "Historical Financial Information", "Pro Forma Adjustments", "Significant Accounting Policies"], "pitfalls": ["Failing to include all required disclosures.", "Incorrectly translating financial information.", "Omitting important accounting policies.", "Not cross-referencing adequately with the main prospectus."]}, {"id": "Back_Cover", "name": "Back Cover", "mandatory": true, "order": 33, "instance_count": 118, "function": "No corpus samples were available for Back_Cover.", "purpose": "", "subsections": [], "writing_rules": [], "required_inputs": [], "pitfalls": []}], "edges": [{"from": "Cover", "to": "Important_Notice", "conf": 0.952, "support": 119}, {"from": "Important_Notice", "to": "Expected_Timetable", "conf": 0.944, "support": 118}, {"from": "Expected_Timetable", "to": "Contents", "conf": 0.944, "support": 118}, {"from": "Contents", "to": "Summary", "conf": 0.936, "support": 117}, {"from": "Summary", "to": "Definitions", "conf": 0.952, "support": 119}, {"from": "Definitions", "to": "Glossary_of_Technical_Terms", "conf": 0.92, "support": 115}, {"from": "Glossary_of_Technical_Terms", "to": "Forward_Looking_Statements", "conf": 0.888, "support": 111}, {"from": "Forward_Looking_Statements", "to": "Risk_Factors", "conf": 0.912, "support": 114}, {"from": "Risk_Factors", "to": "Waivers_and_Exemptions", "conf": 0.784, "support": 98}, {"from": "Risk_Factors", "to": "Prospectus_and_Global_Offering_Information", "conf": 0.136, "support": 17}, {"from": "Waivers_and_Exemptions", "to": "Prospectus_and_Global_Offering_Information", "conf": 0.736, "support": 92}, {"from": "Waivers_and_Exemptions", "to": "Parties_Involved_in_the_Global_Offering", "conf": 0.12, "support": 15}, {"from": "Prospectus_and_Global_Offering_Information", "to": "Parties_Involved_in_the_Global_Offering", "conf": 0.776, "support": 97}, {"from": "Parties_Involved_in_the_Global_Offering", "to": "Corporate_Information", "conf": 0.928, "support": 116}, {"from": "Corporate_Information", "to": "Industry_Overview", "conf": 0.888, "support": 111}, {"from": "Regulatory_Overview", "to": "History_Reorganization_Corporate_Structure", "conf": 0.864, "support": 108}, {"from": "Industry_Overview", "to": "Regulatory_Overview", "conf": 0.864, "support": 108}, {"from": "History_Reorganization_Corporate_Structure", "to": "Business", "conf": 0.832, "support": 104}, {"from": "Business", "to": "Relationship_with_Controlling_Shareholders", "conf": 0.336, "support": 42}, {"from": "Business", "to": "Directors_and_Senior_Management", "conf": 0.208, "support": 26}, {"from": "Business", "to": "Contractual_Arrangements_VIE", "conf": 0.192, "support": 24}, {"from": "Relationship_with_Controlling_Shareholders", "to": "Connected_Transactions", "conf": 0.432, "support": 54}, {"from": "Relationship_with_Controlling_Shareholders", "to": "Substantial_Shareholders", "conf": 0.176, "support": 22}, {"from": "Relationship_with_Controlling_Shareholders", "to": "Directors_and_Senior_Management", "conf": 0.128, "support": 16}, {"from": "Connected_Transactions", "to": "Directors_and_Senior_Management", "conf": 0.352, "support": 44}, {"from": "Directors_and_Senior_Management", "to": "Substantial_Shareholders", "conf": 0.336, "support": 42}, {"from": "Directors_and_Senior_Management", "to": "Relationship_with_Controlling_Shareholders", "conf": 0.216, "support": 27}, {"from": "Directors_and_Senior_Management", "to": "Share_Capital", "conf": 0.168, "support": 21}, {"from": "Substantial_Shareholders", "to": "Share_Capital", "conf": 0.424, "support": 53}, {"from": "Substantial_Shareholders", "to": "Cornerstone_Investors", "conf": 0.248, "support": 31}, {"from": "Share_Capital", "to": "Financial_Information", "conf": 0.488, "support": 61}, {"from": "Share_Capital", "to": "Substantial_Shareholders", "conf": 0.288, "support": 36}, {"from": "Share_Capital", "to": "Cornerstone_Investors", "conf": 0.144, "support": 18}, {"from": "Financial_Information", "to": "Future_Plans_and_Use_of_Proceeds", "conf": 0.728, "support": 91}, {"from": "Future_Plans_and_Use_of_Proceeds", "to": "Underwriting", "conf": 0.792, "support": 99}, {"from": "Future_Plans_and_Use_of_Proceeds", "to": "Cornerstone_Investors", "conf": 0.136, "support": 17}, {"from": "Cornerstone_Investors", "to": "Financial_Information", "conf": 0.176, "support": 22}, {"from": "Cornerstone_Investors", "to": "Share_Capital", "conf": 0.144, "support": 18}, {"from": "Cornerstone_Investors", "to": "Underwriting", "conf": 0.136, "support": 17}, {"from": "Underwriting", "to": "Structure_of_the_Global_Offering", "conf": 0.944, "support": 118}, {"from": "Structure_of_the_Global_Offering", "to": "How_to_Apply_for_Hong_Kong_Offer_Shares", "conf": 0.944, "support": 118}, {"from": "How_to_Apply_for_Hong_Kong_Offer_Shares", "to": "Appendices", "conf": 0.952, "support": 119}, {"from": "Appendices", "to": "Back_Cover", "conf": 0.944, "support": 118}]}`;

type SectionNode = {
  id: string;
  name: string;
  mandatory: boolean;
  order: number;
  instance_count: number;
  function: string;
  purpose: string;
  subsections: string[];
  writing_rules: string[];
  required_inputs: string[];
  pitfalls: string[];
};

type Edge = { from: string; to: string; conf: number; support: number };

type KGData = {
  totals: {
    nodes: number;
    edges: number;
    section_types: number;
    documents: number;
    section_instances: number;
    edge_types: Record<string, number>;
  };
  nodes: SectionNode[];
  edges: Edge[];
};

const DATA = JSON.parse(KG_DATA_JSON) as KGData;

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

function OntologyDiagram({
  nodes,
  edges,
}: {
  nodes: SectionNode[];
  edges: Edge[];
}) {
  const theme = useHostTheme();

  const layout = computeDAGLayout({
    nodes: nodes.map((n) => ({ id: n.id })),
    edges: edges.map((e) => ({ from: e.from, to: e.to })),
    direction: "horizontal",
    nodeWidth: 190,
    nodeHeight: 44,
    rankGap: 70,
    nodeGap: 18,
    padding: 28,
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map(layout.nodes.map((n) => [n.id, n]));

  const maxConf = Math.max(0.001, ...edges.map((e) => e.conf));

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${theme.stroke.tertiary}`, borderRadius: 6 }}>
      <svg
        width={layout.width}
        height={layout.height}
        style={{ display: "block", background: theme.bg.editor }}
      >
        <defs>
          <marker
            id="arrowPrimary"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill={theme.stroke.primary} />
          </marker>
          <marker
            id="arrowMuted"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill={theme.stroke.tertiary} />
          </marker>
        </defs>

        {layout.edges.map((le, i) => {
          const edgeMeta = edges.find((e) => e.from === le.from && e.to === le.to);
          const conf = edgeMeta?.conf ?? 0;
          const strong = conf >= 0.5;
          const stroke = strong ? theme.stroke.primary : theme.stroke.tertiary;
          const width = 0.75 + (conf / maxConf) * 2.25;
          // Smooth bezier between anchors (horizontal flow → horizontal tangents).
          const dx = le.targetX - le.sourceX;
          const c1x = le.sourceX + dx * 0.5;
          const c2x = le.targetX - dx * 0.5;
          const d = `M ${le.sourceX},${le.sourceY} C ${c1x},${le.sourceY} ${c2x},${le.targetY} ${le.targetX},${le.targetY}`;
          return (
            <path
              key={`${le.from}->${le.to}-${i}`}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={width}
              strokeDasharray={le.isBackEdge ? "4 3" : undefined}
              markerEnd={strong ? "url(#arrowPrimary)" : "url(#arrowMuted)"}
              opacity={strong ? 0.9 : 0.55}
            >
              <title>
                {`${le.from} → ${le.to}  ·  confidence ${(conf * 100).toFixed(1)}% · support ${edgeMeta?.support ?? 0}`}
              </title>
            </path>
          );
        })}

        {layout.nodes.map((ln) => {
          const meta = nodeById.get(ln.id);
          if (!meta) return null;
          const fill = meta.mandatory ? theme.fill.secondary : theme.fill.quaternary;
          const stroke = meta.mandatory ? theme.accent.primary : theme.stroke.secondary;
          return (
            <g key={ln.id} transform={`translate(${ln.x},${ln.y})`}>
              <rect
                width={190}
                height={44}
                rx={6}
                ry={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={meta.mandatory ? 1.25 : 1}
              />
              <text
                x={10}
                y={18}
                fill={theme.text.primary}
                fontSize={12}
                fontWeight={meta.mandatory ? 600 : 500}
              >
                {truncate(meta.name, 26)}
                <title>{meta.name}</title>
              </text>
              <text x={10} y={34} fill={theme.text.tertiary} fontSize={10.5}>
                {`#${meta.order} · ${meta.instance_count} docs${meta.mandatory ? " · required" : ""}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function EdgesTable({ edges }: { edges: Edge[] }) {
  const top = [...edges]
    .filter((e) => e.from !== e.to)
    .sort((a, b) => b.conf - a.conf || b.support - a.support)
    .slice(0, 15);
  return (
    <Table
      headers={["From", "→", "To", "Confidence", "Support (docs)"]}
      columnAlign={["left", "center", "left", "right", "right"]}
      rows={top.map((e) => [
        e.from.replaceAll("_", " "),
        "→",
        e.to.replaceAll("_", " "),
        `${(e.conf * 100).toFixed(1)}%`,
        formatInt(e.support),
      ])}
    />
  );
}

function CoverageTable({ nodes }: { nodes: SectionNode[] }) {
  const rows = [...nodes]
    .sort((a, b) => b.instance_count - a.instance_count)
    .map((n) => [
      String(n.order).padStart(2, "0"),
      n.name,
      n.mandatory ? <Pill key={`m-${n.id}`} size="sm" tone="info" active>required</Pill> : <Pill key={`o-${n.id}`} size="sm">optional</Pill>,
      formatInt(n.instance_count),
      `${((n.instance_count / 125) * 100).toFixed(0)}%`,
    ]);
  return (
    <Table
      headers={["Order", "Section", "Mandatory", "Instances", "Corpus coverage"]}
      columnAlign={["right", "left", "left", "right", "right"]}
      rows={rows}
      striped
      stickyHeader
    />
  );
}

function SectionCard({ n }: { n: SectionNode }) {
  const trailing = `#${n.order} · ${n.instance_count} docs`;
  return (
    <Card collapsible defaultOpen={false}>
      <CardHeader trailing={trailing}>{n.name}</CardHeader>
      <CardBody>
        <Stack gap={10}>
          {n.function && (
            <Text size="small" tone="secondary">{n.function}</Text>
          )}
          {n.subsections.length > 0 && (
            <>
              <Text weight="semibold" size="small">Typical structure</Text>
              <Row gap={6} wrap>
                {n.subsections.map((s, i) => (
                  <Pill key={`${n.id}-ss-${i}`} size="sm">{s}</Pill>
                ))}
              </Row>
            </>
          )}
          {n.writing_rules.length > 0 && (
            <>
              <Text weight="semibold" size="small">Writing rules (top {Math.min(n.writing_rules.length, 4)})</Text>
              <Stack gap={4}>
                {n.writing_rules.slice(0, 4).map((r, i) => (
                  <Text key={`${n.id}-wr-${i}`} size="small">• {r}</Text>
                ))}
              </Stack>
            </>
          )}
          {n.required_inputs.length > 0 && (
            <>
              <Text weight="semibold" size="small">Required input fields</Text>
              <Row gap={6} wrap>
                {n.required_inputs.slice(0, 8).map((r, i) => (
                  <Pill key={`${n.id}-ri-${i}`} size="sm" tone="neutral">{r}</Pill>
                ))}
              </Row>
            </>
          )}
          {n.pitfalls.length > 0 && (
            <>
              <Text weight="semibold" size="small">Common pitfalls</Text>
              <Stack gap={4}>
                {n.pitfalls.slice(0, 3).map((p, i) => (
                  <Text key={`${n.id}-pf-${i}`} size="small" tone="secondary">• {p}</Text>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}

export default function KnowledgeGraphExplorer() {
  const theme = useHostTheme();
  const [highConfOnly, setHighConfOnly] = useCanvasState<boolean>("hi-conf-only", false);
  const [mandatoryOnly, setMandatoryOnly] = useCanvasState<boolean>("mandatory-only", false);
  const [showGuidance, setShowGuidance] = useCanvasState<boolean>("show-guidance", true);

  const allNodes = DATA.nodes;
  const filteredNodes = mandatoryOnly ? allNodes.filter((n) => n.mandatory) : allNodes;
  const filteredIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = DATA.edges
    .filter((e) => filteredIds.has(e.from) && filteredIds.has(e.to))
    .filter((e) => (highConfOnly ? e.conf >= 0.5 : true));

  const mandatoryCount = allNodes.filter((n) => n.mandatory).length;
  const topTransitions = [...DATA.edges].sort((a, b) => b.conf - a.conf)[0];

  return (
    <Stack gap={22}>
      <Stack gap={6}>
        <H1>Prospectus Knowledge Graph</H1>
        <Text tone="secondary">
          Multi-layer graph mined from {formatInt(DATA.totals.documents)} HKEX prospectuses. The
          ontology layer defines {DATA.totals.section_types} canonical section types and their
          corpus-observed ordering; the instance layer anchors {formatInt(DATA.totals.section_instances)}{" "}
          concrete section occurrences to their source documents. The agent retrieves from this
          graph when drafting, verifying, and revising each section.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={formatInt(DATA.totals.nodes)} label="Total nodes" />
        <Stat value={formatInt(DATA.totals.edges)} label="Total edges" />
        <Stat value={DATA.totals.section_types} label="Canonical sections" />
        <Stat value={formatInt(DATA.totals.documents)} label="Corpus prospectuses" />
      </Grid>

      <Grid columns={"minmax(0, 1.25fr) minmax(0, 1fr)"} gap={16}>
        <Card>
          <CardHeader>Layers</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Row justify="space-between">
                <Text size="small">Ontology (SectionType)</Text>
                <Text size="small" tone="secondary">{DATA.totals.section_types} nodes</Text>
              </Row>
              <Row justify="space-between">
                <Text size="small">Instance → DocumentNode</Text>
                <Text size="small" tone="secondary">{formatInt(DATA.totals.documents)} nodes</Text>
              </Row>
              <Row justify="space-between">
                <Text size="small">Instance → DocumentSectionInstance</Text>
                <Text size="small" tone="secondary">{formatInt(DATA.totals.section_instances)} nodes</Text>
              </Row>
              <Divider />
              <Text size="small" weight="semibold">Mandatory sections</Text>
              <Row justify="space-between">
                <Text size="small" tone="secondary">Required by corpus convention</Text>
                <Text size="small">{mandatoryCount} / {DATA.totals.section_types}</Text>
              </Row>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Edge types</CardHeader>
          <CardBody>
            <Stack gap={6}>
              {Object.entries(DATA.totals.edge_types)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <Row key={k} justify="space-between">
                    <Text size="small">{k}</Text>
                    <Text size="small" tone="secondary">{formatInt(v)}</Text>
                  </Row>
                ))}
              <Divider />
              <Text size="small" weight="semibold">Strongest ordering signal</Text>
              <Text size="small" tone="secondary">
                {topTransitions.from.replaceAll("_", " ")} → {topTransitions.to.replaceAll("_", " ")}{" "}
                at {(topTransitions.conf * 100).toFixed(1)}% confidence
                across {topTransitions.support} filings.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <Stack gap={10}>
        <H2>Ontology layer — canonical section flow</H2>
        <Text tone="secondary" size="small">
          Each box is a canonical HKEX section. Edges are <Text as="span" weight="semibold" size="small">typically_precedes</Text>{" "}
          relations mined from corpus order, weighted by confidence. Solid accent borders
          mark mandatory sections; edge thickness scales with how consistently the transition
          shows up across the 125-document corpus.
        </Text>
        <Row gap={8} align="center" wrap>
          <Pill
            active={highConfOnly}
            tone="info"
            onClick={() => setHighConfOnly(!highConfOnly)}
          >
            High-confidence edges only (≥50%)
          </Pill>
          <Pill
            active={mandatoryOnly}
            tone="info"
            onClick={() => setMandatoryOnly(!mandatoryOnly)}
          >
            Mandatory sections only
          </Pill>
          <div style={{ flex: 1 }} />
          <Row gap={8} align="center">
            <LegendSwatch
              fill={theme.fill.secondary}
              stroke={theme.accent.primary}
              label="Mandatory"
            />
            <LegendSwatch
              fill={theme.fill.quaternary}
              stroke={theme.stroke.secondary}
              label="Optional"
            />
          </Row>
        </Row>
        <OntologyDiagram nodes={filteredNodes} edges={filteredEdges} />
        <Text size="small" tone="tertiary">
          Showing {filteredNodes.length} nodes and {filteredEdges.length} edges. Scroll horizontally
          for the full flow.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={10}>
        <H2>Strongest section transitions</H2>
        <Text size="small" tone="secondary">
          Top 15 <Text as="span" weight="semibold" size="small">typically_precedes</Text> edges by
          corpus-mined confidence.
        </Text>
        <EdgesTable edges={DATA.edges} />
      </Stack>

      <Divider />

      <Stack gap={10}>
        <H2>Section coverage across the corpus</H2>
        <Text size="small" tone="secondary">
          How many of the 125 sampled prospectuses include each canonical section. Appendices
          appears multiple times per document (subdivided accountant reports, pro-forma data,
          etc.), so its count exceeds the corpus size.
        </Text>
        <CoverageTable nodes={allNodes} />
      </Stack>

      <Divider />

      <Stack gap={10}>
        <Row justify="space-between" align="center">
          <H2>KG guidance distilled per section</H2>
          <Pill
            active={showGuidance}
            onClick={() => setShowGuidance(!showGuidance)}
          >
            {showGuidance ? "Hide cards" : "Show cards"}
          </Pill>
        </Row>
        <Text size="small" tone="secondary">
          For each canonical section, the KG stores a writing card (function, typical
          sub-structure, writing rules, required input fields, common pitfalls) produced from
          multi-shot analysis of the corpus. These cards are injected into the agent prompt at
          draft and revision time. Expand any section to inspect what the agent actually sees.
        </Text>
        {showGuidance && (
          <Grid columns={2} gap={12}>
            {allNodes
              .filter((n) => n.function || n.subsections.length || n.writing_rules.length)
              .map((n) => (
                <SectionCard key={n.id} n={n} />
              ))}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}

function LegendSwatch({
  fill,
  stroke,
  label,
}: {
  fill: string;
  stroke: string;
  label: string;
}) {
  return (
    <Row gap={6} align="center">
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: fill,
          border: `1px solid ${stroke}`,
        }}
      />
      <Text size="small" tone="secondary">{label}</Text>
    </Row>
  );
}
