$token = node -e @'
const jwt = require("jsonwebtoken");
const payload = {
    userId: "cmleybpg2002bjuo2m44y4kip",
    email: "swan@h2m.com",
    role: "OWNER",
    companyId: "cmleybpf70028juo2wwpmp8rt"
};
const secret = "9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314";
const token = jwt.sign(payload, secret, { expiresIn: "24h" });
console.log(token);
'@

$baseUrl = "https://maxp.online/api/v1/ai-sandbox"
$agentId = "agent_dCA-iv75jigRPbhMB6RPYQ"
$model = "deepseek-v4-flash"
$provider = "DEEPSEEK"
$keyId = "cmqguj2zc08akjugf77y348pl"

$outputFile = "$PSScriptRoot\test_swan_offers_results.txt"
"" | Out-File -FilePath $outputFile -Encoding utf8

function Write-Result($text) {
    $text | Out-File -FilePath $outputFile -Append -Encoding utf8
    Write-Host $text
}

function Send-Message($sessionId, $message, $testName) {
    $reqBody = @{
        sessionId = $sessionId
        message   = $message
        agentId   = $agentId
        model     = $model
        provider  = $provider
        keyId     = $keyId
    } | ConvertTo-Json -Compress
    Set-Content -Path "$env:TEMP\msg.json" -Value $reqBody -Encoding utf8
    
    $startTime = Get-Date
    $raw = curl.exe -s -X POST "$baseUrl/chat/stream" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\msg.json" --max-time 120 2>&1
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMilliseconds)
    
    $events = $raw -split "data: "
    $agentReply = ""; $toolsUsed = @(); $traceInfo = @{}
    
    foreach ($event in $events) {
        $event = $event.Trim()
        if ($event -eq "") { continue }
        try {
            $parsed = $event | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $parsed) { continue }
            if ($parsed.type -eq "agent_reply" -and $parsed.reply) { $agentReply = $parsed.reply }
            if ($parsed.type -eq "chunk" -and $parsed.text) { $agentReply += $parsed.text }
            if ($parsed.type -eq "pipeline_trace") { 
                if ($parsed.tools) { foreach ($t in $parsed.tools) { $toolsUsed += $t.name; $traceInfo[$t.name] = $t.result } }
                if ($parsed.intent) { $traceInfo["intent"] = "$($parsed.intent) ($($parsed.confidence))" }
            }
            if ($parsed.type -eq "run_complete") {
                if ($parsed.result.tools) { foreach ($t in $parsed.result.tools) { $toolsUsed += $t.name; if ($t.result) { $traceInfo[$t.name] = $t.result } } }
            }
        } catch {}
    }
    
    return @{
        reply = $agentReply
        tools = ($toolsUsed | Select-Object -Unique)
        trace = $traceInfo
        latency = $elapsed
    }
}

function New-Session($title) {
    $createBody = @{
        agentId = $agentId
        model = $model
        provider = $provider
        keyId = $keyId
        title = $title
    } | ConvertTo-Json -Compress
    Set-Content -Path "$env:TEMP\create.json" -Value $createBody -Encoding utf8
    $result = curl.exe -s -X POST "$baseUrl/sessions" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\create.json" --max-time 30 2>&1
    $info = $result | ConvertFrom-Json
    return $info.session.id
}

# ============================================================
Write-Result "================================================================="
Write-Result "  SWAN AGENT - OFFERS, COUPONS & NEW TOOLS TEST"
Write-Result "  Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Result "  Agent: Sales Rep (نور)"
Write-Result "  Company: Swan (أحذية فاخرة)"
Write-Result "================================================================="

# ============================================================
# SCENARIO 1: OFFERS & COUPONS
# ============================================================
Write-Result "`n`n================================================================="
Write-Result "  SCENARIO 1: OFFERS & COUPONS (offers_list_active + coupon_validate)"
Write-Result "================================================================="

$sid1 = New-Session "Swan Offers & Coupons Test"

$scenario1 = @(
    @{ name = "O01_CheckOffers"; msg = "مرحبا! عندكم عروض ولا تخفيضات دلوقتي على الأحذية؟" }
    @{ name = "O02_CheckCoupon"; msg = "تمام، وعندي كود خصم SHOE20 جربته قبل كده، لسه شغال؟" }
    @{ name = "O03_AskDiscount"; msg = "ممكن أعمل طلب كبير (حوالى 3 آلاف)، هل فيه خصم إضافي تقدر تقدمهولي؟" }
)

foreach ($turn in $scenario1) {
    Write-Result "`n--- TURN: $($turn.name) ---"
    Write-Result "Customer: $($turn.msg)"
    $result = Send-Message $sid1 $turn.msg $turn.name
    Write-Result "Tools: $($result.tools -join ', ')"
    Write-Result "Latency: $($result.latency)ms"
    Write-Result "--- Agent Reply ---"
    Write-Result $result.reply
    Write-Result "--- END $($turn.name) ---"
    Start-Sleep -Seconds 1
}

# ============================================================
# SCENARIO 2: INVENTORY + TOP SELLING + PERFORMANCE
# ============================================================
Write-Result "`n`n================================================================="
Write-Result "  SCENARIO 2: INVENTORY + TOP SELLING + PERFORMANCE"
Write-Result "================================================================="

$sid2 = New-Session "Swan Inventory & Top Selling Test"

$scenario2 = @(
    @{ name = "I01_TopSelling"; msg = "ايه الأكثر مبيعاً عندكم في سوان الفترة دي؟" }
    @{ name = "I02_CheckStock"; msg = "عايز اتأكد هل Swan High Skotch مقاس 39 و 40 موجودة في المخزون؟" }
    @{ name = "I03_ProductPerf"; msg = "أداء Swan Motion عامل إيه في المبيعات؟" }
)

foreach ($turn in $scenario2) {
    Write-Result "`n--- TURN: $($turn.name) ---"
    Write-Result "Customer: $($turn.msg)"
    $result = Send-Message $sid2 $turn.msg $turn.name
    Write-Result "Tools: $($result.tools -join ', ')"
    Write-Result "Latency: $($result.latency)ms"
    Write-Result "--- Agent Reply ---"
    Write-Result $result.reply
    Write-Result "--- END $($turn.name) ---"
    Start-Sleep -Seconds 1
}

# ============================================================
# SCENARIO 3: ABANDONED CARTS
# ============================================================
Write-Result "`n`n================================================================="
Write-Result "  SCENARIO 3: ABANDONED CARTS + CUSTOMER LOOKUP"
Write-Result "================================================================="

$sid3 = New-Session "Swan Abandoned Carts Test"

$scenario3 = @(
    @{ name = "A01_AbandonedCarts"; msg = "فيه حد ساب عربة وماكملش الطلب؟ عايز العميل ده" }
    @{ name = "A02_CustomerInfo"; msg = "ممكن تبحثلي عن عميلة باسم منى أحمد تليفون 01099887766" }
    @{ name = "A03_TopBuyers"; msg = "مين أهم عملائك المميزين اللي بيشتروا كتير؟" }
)

foreach ($turn in $scenario3) {
    Write-Result "`n--- TURN: $($turn.name) ---"
    Write-Result "Customer: $($turn.msg)"
    $result = Send-Message $sid3 $turn.msg $turn.name
    Write-Result "Tools: $($result.tools -join ', ')"
    Write-Result "Latency: $($result.latency)ms"
    Write-Result "--- Agent Reply ---"
    Write-Result $result.reply
    Write-Result "--- END $($turn.name) ---"
    Start-Sleep -Seconds 1
}

# ============================================================
# SCENARIO 4: KNOWLEDGE BASE
# ============================================================
Write-Result "`n`n================================================================="
Write-Result "  SCENARIO 4: KNOWLEDGE BASE (search + ask merchant)"
Write-Result "================================================================="

$sid4 = New-Session "Swan Knowledge Base Test"

$scenario4 = @(
    @{ name = "K01_SearchPolicy"; msg = "عايز أعرف سياسة التوصيل والاسترجاع عندكم إيه؟" }
    @{ name = "K02_AskMerchant"; msg = "كمبيوتر الشغل بتاعي عطلان، إزاي أرجع ابدأ مبيعات من تاني؟" }
)

foreach ($turn in $scenario4) {
    Write-Result "`n--- TURN: $($turn.name) ---"
    Write-Result "Customer: $($turn.msg)"
    $result = Send-Message $sid4 $turn.msg $turn.name
    Write-Result "Tools: $($result.tools -join ', ')"
    Write-Result "Latency: $($result.latency)ms"
    Write-Result "--- Agent Reply ---"
    Write-Result $result.reply
    Write-Result "--- END $($turn.name) ---"
    Start-Sleep -Seconds 1
}

Write-Result "`n`n================================================================="
Write-Result "  ALL TESTS COMPLETE - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Result "================================================================="
Write-Host "`nResults saved to: $outputFile" -ForegroundColor Yellow
