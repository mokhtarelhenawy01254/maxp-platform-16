$env:NODE_PATH = "H:\maxp-platform\apps\backend\node_modules"
$script = @'
const jwt = require('jsonwebtoken');
const payload = {
    userId: "cmleybpg2002bjuo2m44y4kip",
    email: "swan@h2m.com",
    role: "OWNER",
    companyId: "cmleybpf70028juo2wwpmp8rt"
};
const secret = "9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314";
const token = jwt.sign(payload, secret, { expiresIn: '24h' });
console.log(token);
'@
Set-Content -Path "$env:TEMP\gentoken_eval.cjs" -Value $script -Encoding utf8
$token = node "$env:TEMP\gentoken_eval.cjs" 2>&1

$baseUrl = "https://maxp.online/api/v1/ai-sandbox"
$outputFile = "H:\maxp-platform\test_swan_agent_eval_results.txt"
$agentId = "agent_dCA-iv75jigRPbhMB6RPYQ"
$model = "deepseek-v4-flash"
$provider = "DEEPSEEK"
$keyId = "cmqguj2zc08akjugf77y348pl"

"" | Out-File -FilePath $outputFile -Encoding utf8
"=================================================================" | Out-File -FilePath $outputFile -Append -Encoding utf8
"  MAXP SWAN AGENT - PRODUCT SEARCH RAG + SALES SCENARIO EVAL" | Out-File -FilePath $outputFile -Append -Encoding utf8
"  Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $outputFile -Append -Encoding utf8
"  Agent: Sales Rep (نور)" | Out-File -FilePath $outputFile -Append -Encoding utf8
"  Company: Swan (أحذية فاخرة)" | Out-File -FilePath $outputFile -Append -Encoding utf8
"=================================================================" | Out-File -FilePath $outputFile -Append -Encoding utf8

# ============================================================
# PART 1: PRODUCT SEARCH RAG TESTS
# ============================================================
"`n`n" | Out-File -FilePath $outputFile -Append -Encoding utf8
Write-Host "=== Creating session for RAG tests..." -ForegroundColor Cyan

$createBody = @{
    agentId = $agentId
    model = $model
    provider = $provider
    keyId = $keyId
    title = "Swan RAG Product Search Evaluation"
} | ConvertTo-Json -Compress
Set-Content -Path "$env:TEMP\create_rag.json" -Value $createBody -Encoding utf8
$createResult = curl.exe -s -X POST "$baseUrl/sessions" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\create_rag.json" --max-time 30 2>&1
$sessionInfo = $createResult | ConvertFrom-Json
$sessionId = $sessionInfo.session.id
"RAG Session ID: $sessionId" | Out-File -FilePath $outputFile -Append -Encoding utf8
Write-Host "RAG Session ID: $sessionId" -ForegroundColor Green

# --- RAG Test Scenarios (Swan-specific products) ---
$ragTests = @(
    @{ name = "RAG01_ExactProduct";      msg = "عايز أطلب كوتشي Swan High Skotch - المقاس 39 - لونه أسود"; desc = "بحث عن منتج محدد بالاسم والمقاس واللون" }
    @{ name = "RAG02_WrongSpelling";     msg = "عايز كوتشى سوان سكوتش فلات ياغالى"; desc = "بحث بإملاء خطأ (كوتشى, سكوتش) - اختبار RAG" }
    @{ name = "RAG03_SynonymSearch";     msg = "عايز اجيب جزمة حريمي كاجوال"; desc = "بحث بمرادفات (جزمة بدل كوتشي/حذاء)" }
    @{ name = "RAG04_CategorySearch";    msg = "عرضلي كل الأحذية الحريمي اللي عندك"; desc = "بحث بفئة منتجات (أحذية حريمي)" }
    @{ name = "RAG05_PriceRange";        msg = "عندك أحذية في حدود 400 ل 600 جنيه؟"; desc = "بحث بنطاق سعري" }
    @{ name = "RAG06_FeatureSearch";     msg = "عايز حذاء رياضي مريح للمشي"; desc = "بحث بمواصفات (رياضي, مريح, مشي)" }
    @{ name = "RAG07_StyleQuery";        msg = "عايز بوت أنيق شيك للخروج"; desc = "بحث بنمط/ستايل (بوت أنيق شيك)" }
)

foreach ($test in $ragTests) {
    "`n" + ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
    "### TEST: $($test.name) - $($test.desc)" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Message: $($test.msg)" | Out-File -FilePath $outputFile -Append -Encoding utf8
    ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "Running $($test.name)... " -NoNewline -ForegroundColor Cyan
    
    $reqBody = @{
        sessionId = $sessionId
        message   = $test.msg
        agentId   = $agentId
        model     = $model
        provider  = $provider
        keyId     = $keyId
    } | ConvertTo-Json -Compress
    Set-Content -Path "$env:TEMP\rag_msg.json" -Value $reqBody -Encoding utf8
    
    $startTime = Get-Date
    $raw = curl.exe -s -X POST "$baseUrl/chat/stream" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\rag_msg.json" --max-time 120 2>&1
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMilliseconds)
    
    $events = $raw -split "data: "
    $agentReply = ""; $toolsUsed = @(); $intent = ""; $confidence = ""; $modelUsed = ""
    
    foreach ($event in $events) {
        $event = $event.Trim()
        if ($event -eq "") { continue }
        try {
            $parsed = $event | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $parsed) { continue }
            if ($parsed.type -eq "agent_reply" -and $parsed.reply) { $agentReply = $parsed.reply }
            if ($parsed.type -eq "chunk" -and $parsed.text) { $agentReply += $parsed.text }
            if ($parsed.type -eq "pipeline_trace") { 
                $intent = $parsed.intent; $confidence = $parsed.confidence
                if ($parsed.tools) { foreach ($t in $parsed.tools) { $toolsUsed += $t.name } }
            }
            if ($parsed.type -eq "run_complete") {
                if (-not $modelUsed -and $parsed.model) { $modelUsed = $parsed.model }
                if ($parsed.result.tools) { foreach ($t in $parsed.result.tools) { $toolsUsed += $t.name } }
            }
        } catch {}
    }
    
    "Latency: ${elapsed}ms" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($modelUsed) { "Model: $modelUsed" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($intent) { "Intent: $intent | Confidence: $confidence" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($toolsUsed.Count -gt 0) { "Tools: $($toolsUsed -join ', ')" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    "--- Agent Reply ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($agentReply) { $agentReply | Out-File -FilePath $outputFile -Append -Encoding utf8 } else { "(stream failed or empty)" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    "--- END $($test.name) ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "${elapsed}ms" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# ============================================================
# PART 2: FULL SALES SCENARIO (Long conversation)
# ============================================================
"`n`n" + ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
"  PART 2: FULL SALES SCENARIO" | Out-File -FilePath $outputFile -Append -Encoding utf8
("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8

Write-Host "`n=== Creating new session for Sales Scenario..." -ForegroundColor Cyan

$createBody2 = @{
    agentId = $agentId
    model = $model
    provider = $provider
    keyId = $keyId
    title = "Swan Full Sales Scenario"
} | ConvertTo-Json -Compress
Set-Content -Path "$env:TEMP\create_sales.json" -Value $createBody2 -Encoding utf8
$createResult2 = curl.exe -s -X POST "$baseUrl/sessions" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\create_sales.json" --max-time 30 2>&1
$sessionInfo2 = $createResult2 | ConvertFrom-Json
$salesSessionId = $sessionInfo2.session.id
"Sales Scenario Session ID: $salesSessionId" | Out-File -FilePath $outputFile -Append -Encoding utf8
Write-Host "Sales Session ID: $salesSessionId" -ForegroundColor Green

$salesScenario = @(
    @{ name = "S01_Greeting"; msg = "السلام عليكم، عايز أطلب حاجة من عندكم" }
    @{ name = "S02_AskProducts"; msg = "عايز أشوف المنتجات اللي عندكوا، خاصتا الكوتشي الحريمي" }
    @{ name = "S03_SpecificProduct"; msg = "عجبتني Swan High Skotch، عايز 2 واحدة مقاس 39 وواحدة مقاس 40" }
    @{ name = "S04_ColorQuery"; msg = "أي لون متاح ماشي، المهم يكون فاتح وجميل" }
    @{ name = "S05_CustomerInfo"; msg = "اسمي منى أحمد، تليفوني 01099887766، والعنوان: 5 شارع السعادة، مدينة نصر، القاهرة" }
    @{ name = "S06_ConfirmOrder"; msg = "أيوة خلاص، تم الطلب كده" }
    @{ name = "S07_CheckOrder"; msg = "ممكن تشيكلي عالطلب اللي عملته دلوقتي؟" }
    @{ name = "S08_AddProduct"; msg = "فكرت أضيف واحدة Swan Motion كمان مقاس 38 لو لسه في وقت" }
    @{ name = "S09_ShippingQuery"; msg = "التوصيل هياخد كام يوم؟ وهل فيه شحن مجاني ولا لأ؟" }
    @{ name = "S10_ReturnPolicy"; msg = "طب لو مقاس الكوتشي مجاش مناسب، اقدر أرجعه ولا إيه النظام؟" }
    @{ name = "S11_CancelOrder"; msg = "لو سمحت عايزة ألغي الـ Swan Motion اللي طلبتها" }
    @{ name = "S12_ThankYou"; msg = "شكراً جدا على تعبك معايا، خدمة ممتازة 🙏" }
)

foreach ($turn in $salesScenario) {
    "`n" + ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
    "### TURN: $($turn.name)" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Customer: $($turn.msg)" | Out-File -FilePath $outputFile -Append -Encoding utf8
    ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "  $($turn.name)... " -NoNewline -ForegroundColor Cyan
    
    $reqBody = @{
        sessionId = $salesSessionId
        message   = $turn.msg
        agentId   = $agentId
        model     = $model
        provider  = $provider
        keyId     = $keyId
    } | ConvertTo-Json -Compress
    Set-Content -Path "$env:TEMP\sales_msg.json" -Value $reqBody -Encoding utf8
    
    $startTime = Get-Date
    $raw = curl.exe -s -X POST "$baseUrl/chat/stream" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\sales_msg.json" --max-time 120 2>&1
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMilliseconds)
    
    $events = $raw -split "data: "
    $agentReply = ""; $toolsUsed = @();
    
    foreach ($event in $events) {
        $event = $event.Trim()
        if ($event -eq "") { continue }
        try {
            $parsed = $event | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $parsed) { continue }
            if ($parsed.type -eq "agent_reply" -and $parsed.reply) { $agentReply = $parsed.reply }
            if ($parsed.type -eq "chunk" -and $parsed.text) { $agentReply += $parsed.text }
            if ($parsed.type -eq "pipeline_trace") {
                if ($parsed.tools) { foreach ($t in $parsed.tools) { $toolsUsed += $t.name } }
            }
            if ($parsed.type -eq "run_complete") {
                if ($parsed.result.tools) { foreach ($t in $parsed.result.tools) { $toolsUsed += $t.name } }
            }
        } catch {}
    }
    
    "Latency: ${elapsed}ms" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($toolsUsed.Count -gt 0) { "Tools: $($toolsUsed -join ', ')" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    "--- Agent Reply ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($agentReply) { $agentReply | Out-File -FilePath $outputFile -Append -Encoding utf8 } else { "(empty/failed)" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    "--- END $($turn.name) ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "${elapsed}ms" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

"`n`n" + ("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8
"  TEST COMPLETE - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $outputFile -Append -Encoding utf8
("=" * 80) | Out-File -FilePath $outputFile -Append -Encoding utf8

Write-Host "`nAll tests completed. Results saved to $outputFile" -ForegroundColor Yellow
Write-Host "Now I will read the results and provide my sales expert evaluation." -ForegroundColor Magenta
