.PHONY: data-dev-full data-kg-dev data-pack data-verify

data-dev-full:
	python3 scripts/sync_data.py fetch --profile dev-full

data-kg-dev:
	python3 scripts/sync_data.py fetch --profile kg-dev

data-pack:
	./scripts/pack_data_bundle.sh dev-full

data-verify:
	python3 scripts/sync_data.py verify --profile dev-full
