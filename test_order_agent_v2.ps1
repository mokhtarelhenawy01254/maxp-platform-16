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
Set-Content -Path "$env:TEMP\gentoken_final.cjs" -Value $script
$token = node "$env:TEMP\gentoken_final.cjs" 2>&1

$url = "https://maxp.online/api/v1/ai-sandbox"
$outputFile = "H:\maxp-platform\test_results_order_agent.txt"
$baseReq = @{
    agentId = "agent_pmp8rt_55b2a43c1322"
    model = "deepseek-v4-flash"
    provider = "DEEPSEEK"
    keyId = "cmqguj2zc08akjugf77y348pl"
}

# Step 1: Create session
Write-Host "=== Creating session..." -ForegroundColor Cyan
$createBody = $baseReq.Clone()
$createBody.title = "Order Agent Comprehensive Test"
$createJson = $createBody | ConvertTo-Json -Compress
Set-Content -Path "$env:TEMP\create_s.json" -Value $createJson -Encoding utf8
$createResult = curl.exe -s -X POST "$url/sessions" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\create_s.json" --max-time 30 2>&1
Write-Host "Create: $createResult"
$sessionInfo = $createResult | ConvertFrom-Json
$sessionId = $sessionInfo.session.id
Write-Host "Session ID: $sessionId" -ForegroundColor Green

# Clear output file
"" | Out-File -FilePath $outputFile -Encoding utf8
"Session ID: $sessionId" | Out-File -FilePath $outputFile -Append -Encoding utf8
"" | Out-File -FilePath $outputFile -Append -Encoding utf8

$tests = @(
    @{ name = "01_Greeting"; message = "السلام عليكم، عايز أطلب طلبيتك من عندكم" }
    @{ name = "02_AskProducts"; message = "عايز اشوف منتجاتكم - في عندكم شنط نسائية؟" }
    @{ name = "03_SpecificOrder"; message = "عايز اشتري شنطة ظهر one size باللون الأسود - ممكن تعمللي طلب؟" }
    @{ name = "04_OrderCancellation"; message = "أنا عملت طلب قبل كده وعايز ألغيه" }
    @{ name = "05_OrderStatus"; message = "عايز أعرف حالة الطلب بتاعي رقم 12345" }
    @{ name = "06_Refund"; message = "عايز أرجع منتج اشتريته منكم" }
    @{ name = "07_ComplexRequest"; message = "عايز أطلب 3 قطع مختلفة: شنطة سوداء large وواحدة بنية medium وحزام أسود small" }
)

foreach ($test in $tests) {
    $testName = $test.name
    $msg = $test.message
    
    $separator = "=" * 80
    "$separator`nTEST: $testName`nMessage: $msg`n$separator" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "`nRunning $testName ..." -ForegroundColor Cyan
    
    $reqBody = @{
        sessionId = $sessionId
        message   = $msg
        agentId   = $baseReq.agentId
        model     = $baseReq.model
        provider  = $baseReq.provider
        keyId     = $baseReq.keyId
    }
    $reqJson = $reqBody | ConvertTo-Json -Compress
    Set-Content -Path "$env:TEMP\msg.json" -Value $reqJson -Encoding utf8
    
    $startTime = Get-Date
    $rawOutput = curl.exe -s -X POST "$url/chat/stream" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "@$env:TEMP\msg.json" --max-time 120 2>&1
    $endTime = Get-Date
    $totalLatency = ($endTime - $startTime).TotalMilliseconds
    
    # Save raw output
    "`n--- RAW SSE RESPONSE ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    $rawOutput | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    # Parse SSE events
    $events = $rawOutput -split "data: "
    $agentReply = ""
    $pipelineTrace = ""
    $intent = ""
    $confidence = ""
    $blocked = ""
    $tools = @()
    $latencyMs = ""
    $modelUsed = ""
    $errorInfo = ""
    $hasTokensTool = $false
    $hasProductsTool = $false
    
    foreach ($event in $events) {
        $event = $event.Trim()
        if ($event -eq "") { continue }
        try {
            $parsed = $event | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (-not $parsed) { continue }
            
            # Save parsed event
            "`n--- SSE EVENT [type:$($parsed.type)] ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
            $parsed | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Append -Encoding utf8
            
            if ($parsed.type -eq "agent_reply" -and $parsed.reply) {
                $agentReply = $parsed.reply
            }
            if ($parsed.type -eq "run_complete" -and $parsed.reply) {
                if ($agentReply -eq "") { $agentReply = $parsed.reply }
            }
            if ($parsed.type -eq "chunk" -and $parsed.text) {
                $agentReply += $parsed.text
            }
            if ($parsed.type -eq "pipeline_trace") {
                $pipelineTrace = $parsed | ConvertTo-Json -Depth 10
                $intent = $parsed.intent
                $confidence = $parsed.confidence
                $blocked = $parsed.blockedReason
                if ($parsed.tools) {
                    foreach ($t in $parsed.tools) {
                        $tools += $t.name
                    }
                }
            }
            if ($parsed.type -eq "run_complete") {
                if ($parsed.latencyMs) { $latencyMs = $parsed.latencyMs }
                if ($parsed.model) { $modelUsed = $parsed.model }
                if ($parsed.error) { $errorInfo = $parsed.error }
                if ($parsed.blockedReason) { $blocked = $parsed.blockedReason }
                if ($parsed.tools) {
                    foreach ($t in $parsed.tools) {
                        $tools += $t.name
                    }
                }
                if ($parsed.result) {
                    if (!$latencyMs -and $parsed.result.latencyMs) { $latencyMs = $parsed.result.latencyMs }
                    if (!$blocked -and $parsed.result.blockedReason) { $blocked = $parsed.result.blockedReason }
                    if ($parsed.result.tools) {
                        foreach ($t in $parsed.result.tools) {
                            $tools += $t.name
                        }
                    }
                }
            }
            # Also try to extract from the full taskResult in run_complete
            if ($parsed.type -eq "run_complete" -and $parsed.result) {
                if ($parsed.result.pipelineTrace) {
                    if (!$intent) { $intent = $parsed.result.pipelineTrace.intent }
                    if (!$confidence) { $confidence = $parsed.result.pipelineTrace.confidence }
                }
            }
        } catch {
            # Not JSON
        }
    }
    
    # Summary
    "`n--- SUMMARY ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Test: $testName" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Request: $msg" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Total Wall Clock Time: $([math]::Round($totalLatency)) ms" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($latencyMs) { "Latency (reported): $latencyMs ms" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($modelUsed) { "Model: $modelUsed" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($agentReply -ne "") { 
        $replyPreview = if ($agentReply.Length -gt 200) { $agentReply.Substring(0,200) + "..." } else { $agentReply }
        "Agent Reply: $replyPreview" | Out-File -FilePath $outputFile -Append -Encoding utf8
    }
    if ($intent) { "Pipeline Intent: $intent" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($confidence) { "Pipeline Confidence: $confidence" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($blocked) { "Blocked Reason: $blocked" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($tools.Count -gt 0) { "Tools Executed: $($tools -join ', ')" | Out-File -FilePath $outputFile -Append -Encoding utf8 } 
    else { "Tools Executed: (none)" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    if ($errorInfo) { "Error: $errorInfo" | Out-File -FilePath $outputFile -Append -Encoding utf8 }
    "--- END TEST $testName ---`n" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "  Done. Wall time: $([math]::Round($totalLatency)) ms" -ForegroundColor Green
    
    # Small delay
    Start-Sleep -Seconds 1
}

Write-Host "`nAll tests completed. Results saved to $outputFile" -ForegroundColor Yellow
