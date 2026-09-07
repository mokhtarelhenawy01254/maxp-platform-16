#!/bin/bash
export PGPASSWORD=mokhtar1234
PSQL="/usr/bin/psql -h localhost -p 5432 -U appuser -d maxp -t -A -F|"

CID="cmth0nnxy0104jumu9onticyy"
echo "=== designTokens ==="
$PSQL -c "SELECT \"designTokens\" FROM storefront_settings WHERE \"companyId\"='$CID';"
