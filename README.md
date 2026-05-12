# serverless-crud-api

> Event-driven serverless CRUD API on AWS — Lambda, API Gateway v2 (HTTP API), DynamoDB, and Terraform. Fully automated with GitHub Actions CI/CD.

---

## Overview

A production-style serverless REST API built on AWS using an event-driven, pay-per-use architecture. All infrastructure is defined in modular Terraform — each service in its own `.tf` file. The Lambda function is written in Node.js and automatically packaged and deployed through two separate GitHub Actions pipelines: one for infrastructure validation, one for deployment.

---

## Architecture

```
Client Request
      │
      ▼
┌──────────────────────────┐
│  API Gateway v2 (HTTP)   │  ◄── HTTP API, 5 routes, auto-deploy stage
│  (apigw.tf)              │      POST /items
│                          │      GET  /items
│                          │      GET  /items/{id}
│                          │      PUT  /items/{id}
│                          │      DELETE /items/{id}
└────────────┬─────────────┘
             │  AWS_PROXY integration (payload format 2.0)
             ▼
┌──────────────────────────┐
│  AWS Lambda              │  ◄── Node.js 18.x handler (lambda/index.js)
│  (lambda.tf)             │      Packaged as ZIP, hash-tracked by Terraform
└────────────┬─────────────┘
             │  Read / Write
             ▼
┌──────────────────────────┐
│  DynamoDB Table          │  ◄── PAY_PER_REQUEST billing, partition key: id (String)
│  (dynamodb.tf)           │      No capacity planning required
└──────────────────────────┘

All infrastructure provisioned by Terraform (infra/)
Deployed automatically by GitHub Actions (.github/workflows/)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Cloud Provider | AWS |
| API Layer | Amazon API Gateway v2 — HTTP API |
| Compute | AWS Lambda (Node.js 18.x) |
| Database | Amazon DynamoDB (PAY_PER_REQUEST) |
| Infrastructure as Code | Terraform (modular — per-service .tf files) |
| CI/CD | GitHub Actions (`terraform-ci.yml` + `deploy.yml`) |
| Security | IAM execution role scoped to DynamoDB table ARN |

---

## Repository Structure

```
serverless-crud-api/
│
├── .github/workflows/
│   ├── terraform-ci.yml     # Validates on PR — fmt check, validate, plan
│   └── deploy.yml           # Deploys on merge to main — packages ZIP, terraform apply
│
├── infra/
│   ├── main.tf              # Provider config — AWS provider, required version >= 1.0
│   ├── apigw.tf             # API Gateway v2: HTTP API, Lambda integration, 5 routes, stage
│   ├── lambda.tf            # Lambda function, IAM role, execution policy, API permission
│   ├── dynamodb.tf          # DynamoDB table — PAY_PER_REQUEST, hash key: id
│   ├── variables.tf         # Input variables (region, table name, function name)
│   └── output.tf            # Outputs (API endpoint URL, Lambda ARN, table name)
│
├── lambda/
│   └── index.js             # Node.js Lambda handler — routes all CRUD operations
│
└── .gitignore               # Excludes .terraform/, *.tfstate, *.zip, node_modules
```

---

## What This Project Demonstrates

- **API Gateway v2 (HTTP API)** — chose HTTP API over REST API v1 for lower latency and significantly reduced cost; uses `AWS_PROXY` integration with payload format 2.0
- **Modular Terraform** — infrastructure split by service (`apigw.tf`, `lambda.tf`, `dynamodb.tf`) rather than one monolithic file; each component independently readable and editable
- **Hash-based Lambda deployment** — `source_code_hash = filebase64sha256(...)` ensures Terraform detects function changes on every deploy, not just infrastructure changes
- **Serverless cost model** — DynamoDB `PAY_PER_REQUEST` + Lambda invocation pricing = zero cost at zero traffic
- **Two-pipeline CI/CD** — infrastructure validation (`terraform-ci.yml`) on PRs; application deployment (`deploy.yml`) on merge to main — plan and apply are separated by design
- **Real debugging** — resolved Lambda ZIP path mismatch between `deploy.yml` output and `lambda.tf` `filename` attribute, which caused Terraform to silently skip Lambda updates

---

## API Endpoints

| Method | Path | Operation |
|---|---|---|
| `POST` | `/items` | Create a new item |
| `GET` | `/items` | Retrieve all items |
| `GET` | `/items/{id}` | Retrieve item by ID |
| `PUT` | `/items/{id}` | Update item by ID |
| `DELETE` | `/items/{id}` | Delete item by ID |

---

## CI/CD Pipeline

### `terraform-ci.yml` — Infrastructure Validation (Pull Request)
```
terraform fmt --check
terraform validate
terraform plan
```

### `deploy.yml` — Application Deployment (Push to main)
```
Package lambda/index.js → lambda.zip
terraform init
terraform apply -auto-approve
```

---

## Infrastructure Provisioning

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.0
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with valid credentials
- AWS IAM permissions for Lambda, API Gateway, DynamoDB, and IAM

### Deploy Manually

```bash
# Package the Lambda function
cd lambda/
zip lambda.zip index.js

# Navigate to infrastructure directory
cd ../infra/

# Initialise Terraform
terraform init

# Preview all resources
terraform plan

# Provision infrastructure
terraform apply

# Get the API endpoint URL
terraform output
```

### Deploy via GitHub Actions

1. Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub repository secrets
2. Push to `main` — `deploy.yml` packages the Lambda and runs `terraform apply` automatically
3. Open a PR — `terraform-ci.yml` validates and plans without applying

---

## Key Debugging: Lambda ZIP Path Fix

During CI/CD setup, `terraform apply` completed successfully but Lambda was not updating on new deployments. Root cause: the `filename` path in `lambda.tf` pointed to `../lambda/lambda.zip` but the GitHub Actions workflow was outputting the ZIP to a different working directory, so Terraform's `source_code_hash` never changed — it kept seeing the same (or missing) file.

**Fix:** Aligned the ZIP output path in `deploy.yml` with the `filename` and `source_code_hash` paths in `lambda.tf`, ensuring every deploy produces a file Terraform can find and hash-compare correctly.

---

## Known Improvement

The current IAM policy uses `dynamodb:*` on the table ARN. A stricter least-privilege policy would scope this to only the actions the Lambda actually needs:

```json
"Action": [
  "dynamodb:GetItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
  "dynamodb:DeleteItem",
  "dynamodb:Scan",
  "dynamodb:Query"
]
```

This prevents the Lambda role from being able to call `DeleteTable`, `CreateTable`, or other administrative actions it has no business executing.

---

## Author

**Ed Eguaikhide**
DevOps Engineer | AWS | Terraform | Serverless | CI/CD
[LinkedIn](https://linkedin.com/in/ed-eguaikhide) · [Portfolio](https://sites.google.com/view/edeguaikhide) · [GitHub](https://github.com/Soore-ai)

---

*Built as part of the DMI DevOps Micro-Internship Cohort 2 (2026)*
