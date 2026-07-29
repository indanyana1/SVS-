# ============================================================
# migrate-supabase.ps1
# Exports all data from the OLD Supabase project and imports
# it into the NEW one. Run once, then delete this file.
#
# HOW TO USE:
#   1. Fill in the four variables below (OLD and NEW credentials).
#   2. Right-click this file -> "Run with PowerShell"
#      OR open PowerShell in this folder and type:  .\migrate-supabase.ps1
# ============================================================

# ---- FILL THESE IN ----------------------------------------
$OLD_PROJECT_REF  = "skxbobaglykmgavfinxs"   # e.g. abcdefghijklmnop  (Settings > General)
$OLD_DB_PASSWORD  = "indanyana123"   # Settings > Database > Database password

$NEW_PROJECT_REF  = "hrwtggprhxuejabmxtdo"   # same for the new project
$NEW_DB_PASSWORD  = "indanyana1232"
# -----------------------------------------------------------

# Build connection strings (direct port 5432, not pooler)
$OLD_CONN = "postgresql://postgres:${OLD_DB_PASSWORD}@db.${OLD_PROJECT_REF}.supabase.co:5432/postgres"
$NEW_CONN = "postgresql://postgres:${NEW_DB_PASSWORD}@db.${NEW_PROJECT_REF}.supabase.co:5432/postgres"

$BACKUP_FILE = "$PSScriptRoot\data_backup.sql"
$SCHEMA_FILE = "$PSScriptRoot\supabase\apply-all.sql"

# ---- Validation -------------------------------------------
if ($OLD_PROJECT_REF -eq "XXXXXXXXXXXXXXXXXXXX" -or $NEW_PROJECT_REF -eq "XXXXXXXXXXXXXXXXXXXX") {
    Write-Host ""
    Write-Host "ERROR: Please fill in OLD_PROJECT_REF and NEW_PROJECT_REF at the top of this script." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ---- Check pg_dump is available ---------------------------
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$psql   = Get-Command psql   -ErrorAction SilentlyContinue

if (-not $pgDump -or -not $psql) {
    Write-Host ""
    Write-Host "ERROR: pg_dump / psql not found." -ForegroundColor Red
    Write-Host "Install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Make sure to tick 'Add to PATH' during install, then restart this terminal." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "=== Biznisdil Supabase Migration ===" -ForegroundColor Cyan
Write-Host "Old project : $OLD_PROJECT_REF"
Write-Host "New project : $NEW_PROJECT_REF"
Write-Host ""

# ---- Step 1: Apply schema to new project ------------------
Write-Host "[1/3] Applying schema to new project..." -ForegroundColor Yellow

if (-not (Test-Path $SCHEMA_FILE)) {
    Write-Host "ERROR: Cannot find $SCHEMA_FILE" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$env:PGPASSWORD = $NEW_DB_PASSWORD
psql $NEW_CONN -f $SCHEMA_FILE -v ON_ERROR_STOP=0 2>&1 | Out-Null
Write-Host "  Schema applied." -ForegroundColor Green

# ---- Step 2: Export data from old project -----------------
Write-Host "[2/3] Exporting data from old project..." -ForegroundColor Yellow

$TABLES = @(
    "public.account_users",
    "public.seller_profiles",
    "public.marketplace_items",
    "public.cart_items",
    "public.wishlist_items",
    "public.inventory_deduction_events",
    "public.inventory_audit_log",
    "public.orders",
    "public.notifications",
    "public.product_reviews",
    "public.password_reset_tokens",
    "public.support_chat_threads",
    "public.support_chat_messages",
    "public.user_presence",
    "public.wallet_accounts",
    "public.wallet_transactions",
    "public.wallet_otp_codes",
    "public.wallet_beneficiaries",
    "public.wallet_bank_accounts",
    "public.wallet_withdrawal_requests",
    "public.banned_identifiers",
    "public.seller_profile_audit_log",
    "public.admin_users",
    "public.admin_sessions",
    "public.admin_action_log",
    "public.general_labour_bookings",
    "public.home_care_bookings",
    "public.buyer_addresses"
)

$tableArgs = $TABLES | ForEach-Object { "-t", $_ }

$env:PGPASSWORD = $OLD_DB_PASSWORD
& pg_dump $OLD_CONN `
    --data-only `
    --no-owner `
    --no-acl `
    --disable-triggers `
    @tableArgs `
    --file=$BACKUP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed. Check your OLD credentials." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$lines = (Get-Content $BACKUP_FILE | Measure-Object -Line).Lines
Write-Host "  Exported $lines lines to data_backup.sql" -ForegroundColor Green

# ---- Step 3: Import into new project ----------------------
Write-Host "[3/3] Importing data into new project..." -ForegroundColor Yellow

$env:PGPASSWORD = $NEW_DB_PASSWORD
psql $NEW_CONN -f $BACKUP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Some rows may have failed (e.g. duplicates). Check output above." -ForegroundColor Yellow
} else {
    Write-Host "  Import complete." -ForegroundColor Green
}

# ---- Done -------------------------------------------------
Write-Host ""
Write-Host "=== Migration complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Update your .env file with the new project URL and anon key"
Write-Host "     REACT_APP_SUPABASE_URL=https://$NEW_PROJECT_REF.supabase.co"
Write-Host "     REACT_APP_SUPABASE_ANON_KEY=<new anon key from Settings > API>"
Write-Host ""
Write-Host "  2. Migrate uploaded files (images) manually:"
Write-Host "     Old project Storage -> download marketplace-items, profile-images, chat-media"
Write-Host "     New project Storage -> upload to the same bucket names"
Write-Host ""
Write-Host "  3. Delete this script and data_backup.sql when done (contain credentials/data)."
Write-Host ""

$env:PGPASSWORD = ""   # clear from environment

Read-Host "Press Enter to close"
