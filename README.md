# serverless-crud-api

> Event-driven serverless CRUD API on AWS — Lambda, API Gateway, DynamoDB, and Terraform. Fully automated with GitHub Actions CI/CD.

---

## Overview

A production-style serverless REST API built on AWS using an event-driven architecture. All infrastructure is provisioned through modular Terraform with each service in its own configuration file. The Lambda function code is written in Node.js and packaged and deployed automatically via two separate GitHub Actions pipelines — one for infrastructure, one for the application.

---

## Architecture

```
Client Request
      │
      ▼
┌─────────────────────┐
│   API Gateway        │  ◄── REST API, routes, stages, throttling
│   (apigw.tf)        │
└────────┬────────────┘
         │  Invoke
         ▼
┌─────────────────────┐
│   AWS Lambda         │  ◄── Node.js handler (lambda/index.js)
│   (lambda.tf)       │       Packaged as ZIP, deployed via Terraform
└────────┬────────────┘
         │  Read / Write
         ▼
┌─────────────────────┐
│   DynamoDB Table     │  ◄── NoSQL, pay-per-request billing mode
│   (dynamodb.tf)     │       Auto-scaling, no server management
└─────────────────────┘

Infrastructure provisioned by Terraform (infra/)
Deployed by GitHub Actions (.github/workflows/)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Cloud Provider | AWS |
| API Layer | Amazon API Gateway (REST) |
| Compute | AWS Lambda (Node.js) |
| Database | Amazon DynamoDB |
| Infrastructure as Code | Terraform (modular — per-service .tf files) |
| CI/CD | GitHub Actions (`terraform-ci.yml` + `deploy.yml`) |
| Security | IAM least-privilege roles, Lambda execution policy |

---

## Repository Structure

```
serverless-crud-api/
│
├── .github/workflows/
│   ├── terraform-ci.yml     # Runs terraform fmt, validate, plan on pull requests
│   └── deploy.yml           # Packages Lambda ZIP and runs terraform apply on merge to main
│
├── infra/
│   ├── main.tf              # Provider config, backend, shared locals
│   ├── apigw.tf             # API Gateway REST API, resources, methods, integrations, stage
│   ├── lambda.tf            # Lambda function, IAM execution role, ZIP source, permissions
│   ├── dynamodb.tf          # DynamoDB table, billing mode, partition key
│   ├── variables.tf         # Input variables (region, table name, function name, etc.)
│   └── output.tf            # Outputs (API endpoint URL, Lambda ARN, DynamoDB table name)
│
├── lambda/
│   └── index.js             # Node.js Lambda handler — routes CRUD operations
│
└── .gitignore               # Excludes .terraform/, *.tfstate, *.zip, node_modules
```

---

## What This Project Demonstrates

- **Modular Terraform** — infrastructure split by service (`apigw.tf`, `lambda.tf`, `dynamodb.tf`) rather than one monolithic file, making each component independently readable and editable
- **Serverless architecture** — no servers to manage; Lambda scales automatically, DynamoDB uses pay-per-request billing, API Gateway handles routing and throttling
- **Two-pipeline CI/CD** — infrastructure validation (`terraform-ci.yml`) runs on PRs; application deployment (`deploy.yml`) triggers on merge to main — separating plan from apply
- **IAM least-privilege** — Lambda execution role scoped to only the DynamoDB table it needs; no wildcard resource permissions
- **Real debugging** — resolved a Lambda ZIP path misconfiguration in Terraform where the packaged function file path didn't match the expected source path, causing silent deployment failures

---

## CI/CD Pipeline

### `terraform-ci.yml` — Infrastructure Validation (runs on Pull Request)
```
terraform fmt --check
terraform validate  
terraform plan
```

### `deploy.yml` — Application Deployment (runs on push to main)
```
Package lambda/index.js → function.zip
terraform init
terraform apply -auto-approve
```

---

## Infrastructure Provisioning

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.0
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with valid credentials
- AWS IAM user or role with permissions for Lambda, API Gateway, DynamoDB, and IAM

### Deploy Manually

```bash
# Navigate to infrastructure directory
cd infra/

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
2. Push to `main` — `deploy.yml` automatically packages the Lambda and applies Terraform
3. Open a PR — `terraform-ci.yml` runs validation and plan without applying

---

## API Endpoints

Once deployed, the API Gateway endpoint is output by Terraform. The Lambda handler routes requests based on HTTP method and path:

| Method | Path | Operation |
|---|---|---|
| POST | `/items` | Create item |
| GET | `/items/{id}` | Read item |
| PUT | `/items/{id}` | Update item |
| DELETE | `/items/{id}` | Delete item |

---

## Key Debugging: Lambda ZIP Path Fix

During deployment, Terraform successfully ran `apply` but the Lambda function was not being updated. The root cause was a mismatch between the ZIP file path referenced in `lambda.tf` and the actual output path of the packaging step in the GitHub Actions workflow.

**The fix:** Aligned the `filename` attribute in the `aws_lambda_function` resource in `lambda.tf` to match the exact path where `deploy.yml` outputs `function.zip`, ensuring Terraform correctly detects file changes and triggers a Lambda update on each deploy.

This is a common production gotcha — Terraform uses the ZIP file hash to detect changes, so a path mismatch means it never sees the new package.

---

## Security

- Lambda execution role uses **least-privilege IAM policy** — scoped to the specific DynamoDB table ARN, not `*`
- AWS credentials stored as **GitHub Actions secrets** — never hardcoded in code or Terraform files
- `.gitignore` excludes `.terraform/`, `*.tfstate`, `*.tfvars`, and `*.zip` from version control

---

## Author

**Ed Eguaikhide**
DevOps Engineer | AWS | Terraform | Serverless | CI/CD
[LinkedIn](https://linkedin.com/in/ed-eguaikhide) · [Portfolio](https://sites.google.com/view/edeguaikhide) · [GitHub](https://github.com/Soore-ai)

---

*Built as part of the DMI DevOps Micro-Internship Cohort 2 (2026)*
