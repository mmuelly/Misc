#!/usr/bin/env bash
# deploy.sh — Deploy the Calorie Burn Agent to Google Cloud Run
#
# Usage:
#   export ANTHROPIC_API_KEY="sk-ant-..."
#   export NTFY_TOPIC="my-calorie-alerts-abc123"
#   ./deploy.sh
#
# Optional overrides (export before running):
#   PROJECT_ID      — GCP project (defaults to gcloud config value)
#   REGION          — Cloud Run region (default: us-central1)
#   SERVICE_NAME    — Cloud Run service name (default: calorie-burn-agent)
#   IPA_CALORIES    — Calories per IPA (default: 280)
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
die()   { echo "[ERROR] $*" >&2; exit 1; }

require_cmd() { command -v "$1" &>/dev/null || die "'$1' is required but not installed."; }

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
require_cmd gcloud
require_cmd python3

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
[[ -z "$PROJECT_ID" ]] && die "PROJECT_ID is not set. Run: gcloud config set project YOUR_PROJECT_ID"

REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-calorie-burn-agent}"
IPA_CALORIES="${IPA_CALORIES:-280}"

# Secrets (must be set)
[[ -z "${ANTHROPIC_API_KEY:-}" ]] && die "ANTHROPIC_API_KEY is not set."
[[ -z "${NTFY_TOPIC:-}" ]]        && die "NTFY_TOPIC is not set."

# Derived names
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
BUCKET="${PROJECT_ID}-${SERVICE_NAME}-state"
SA_NAME="${SERVICE_NAME}-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Generate a random API key if not provided
AGENT_API_KEY="${AGENT_API_KEY:-$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')}"

info "Project:      $PROJECT_ID"
info "Region:       $REGION"
info "Service:      $SERVICE_NAME"
info "Image:        $IMAGE"
info "State bucket: $BUCKET"

# ---------------------------------------------------------------------------
# 1. Enable required APIs
# ---------------------------------------------------------------------------
info "Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  containerregistry.googleapis.com \
  --project "$PROJECT_ID" \
  --quiet

# ---------------------------------------------------------------------------
# 2. Service account
# ---------------------------------------------------------------------------
info "Setting up service account..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name "Calorie Burn Agent" \
    --project "$PROJECT_ID"
  info "Created service account: $SA_EMAIL"
else
  info "Service account already exists: $SA_EMAIL"
fi

# ---------------------------------------------------------------------------
# 3. GCS bucket for state
# ---------------------------------------------------------------------------
info "Setting up GCS bucket: $BUCKET"
if ! gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT_ID" &>/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --uniform-bucket-level-access
  info "Created bucket: gs://$BUCKET"
else
  info "Bucket already exists: gs://$BUCKET"
fi

# Grant the service account read/write on the bucket
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member "serviceAccount:$SA_EMAIL" \
  --role "roles/storage.objectAdmin" \
  --project "$PROJECT_ID" \
  --quiet

# ---------------------------------------------------------------------------
# 4. Store secrets in Secret Manager
# ---------------------------------------------------------------------------
info "Storing secrets in Secret Manager..."

store_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project "$PROJECT_ID" &>/dev/null 2>&1; then
    echo -n "$value" | gcloud secrets versions add "$name" \
      --data-file=- --project "$PROJECT_ID"
    info "Updated secret: $name"
  else
    echo -n "$value" | gcloud secrets create "$name" \
      --data-file=- --replication-policy automatic --project "$PROJECT_ID"
    info "Created secret: $name"
  fi
  # Grant access to the service account
  gcloud secrets add-iam-policy-binding "$name" \
    --member "serviceAccount:$SA_EMAIL" \
    --role "roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" \
    --quiet
}

store_secret "calorie-agent-anthropic-key" "$ANTHROPIC_API_KEY"
store_secret "calorie-agent-ntfy-topic"    "$NTFY_TOPIC"
store_secret "calorie-agent-api-key"       "$AGENT_API_KEY"

# ---------------------------------------------------------------------------
# 5. Build the container with Cloud Build
# ---------------------------------------------------------------------------
info "Building container image with Cloud Build..."
gcloud builds submit . \
  --tag "$IMAGE" \
  --project "$PROJECT_ID"

# ---------------------------------------------------------------------------
# 6. Deploy to Cloud Run
# ---------------------------------------------------------------------------
info "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "STATE_BUCKET=${BUCKET},IPA_CALORIES=${IPA_CALORIES}" \
  --set-secrets "ANTHROPIC_API_KEY=calorie-agent-anthropic-key:latest,NTFY_TOPIC=calorie-agent-ntfy-topic:latest,AGENT_API_KEY=calorie-agent-api-key:latest" \
  --quiet

# ---------------------------------------------------------------------------
# 7. Print summary
# ---------------------------------------------------------------------------
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" --project "$PROJECT_ID" \
  --format "value(status.url)")

echo ""
echo "============================================================"
echo "  Deployment complete!"
echo "============================================================"
echo "  Service URL:  $SERVICE_URL"
echo "  Status:       $SERVICE_URL/status"
echo "  Agent API key: $AGENT_API_KEY"
echo ""
echo "  Update your iOS Shortcut URL to:"
echo "    $SERVICE_URL/health-update"
echo ""
echo "  Add this header to the Shortcut HTTP request:"
echo "    Authorization: Bearer $AGENT_API_KEY"
echo ""
echo "  Test with:"
echo "    curl -X POST $SERVICE_URL/health-update \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -H 'Authorization: Bearer $AGENT_API_KEY' \\"
echo "      -d '{\"active_calories\": 280}'"
echo "============================================================"
