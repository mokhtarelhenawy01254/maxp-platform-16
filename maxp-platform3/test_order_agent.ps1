$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgxNjI4Nzk0LCJleHAiOjE3ODE3MTUxOTR9.FPN6ubJVnvHLngeEx-Cudfd9hpkTUtKv7D74Bmg9qyY"
$sessionId = "test_session_001"
$agentId = "agent_pmp8rt_55b2a43c1322"
$keyId = "cmqguj2zc08akjugf77y348pl"
$model = "deepseek-v4-flash"
$provider = "DEEPSEEK"
$url = "https://maxp.online/api/v1/ai-sandbox/chat/stream"
$outputFile = "H:\maxp-platform\test_results_order_agent.txt"

$tests = @(
    @{ name = "01_Greeting"; message = "السلام عليكم، عايز أطلب طلبيتك من عندكم" },
    @{ name = "02_AskProducts"; message = "عايز اشوف منتجاتكم - في عندكم شنط نسائية؟" },
    @{ name = "03_SpecificOrder"; message = "عايز اشتري شنطة ظهر one size باللون الأسود - ممكن تعمللي طلب؟" },
    @{ name = "04_OrderCancellation"; message = "أنا عملت طلب قبل كده وعايز ألغيه" },
    @{ name = "05_OrderStatus"; message = "عايز أعرف حالة الطلب بتاعي رقم 12345" },
    @{ name = "06_Refund"; message = "عايز أرجع منتج اشتريته منكم" },
    @{ name = "07_ComplexRequest"; message = "عايز أطلب 3 قطع مختلفة: شنطة سوداء large وواحدة بنية medium وحزام أسود small" }
)

# Clear output file
"" | Out-File -FilePath $outputFile -Encoding utf8

foreach ($test in $tests) {
    $testName = $test.name
    $msg = $test.message
    
    $separator = "=" * 80
    "$separator`nTEST: $testName`nMessage: $msg`n$separator" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "`nRunning test $testName ..." -ForegroundColor Cyan
    
    $body = @{
        sessionId = $sessionId
        message   = $msg
        agentId   = $agentId
        model     = $model
        provider  = $provider
        keyId     = $keyId
    } | ConvertTo-Json -Compress
    
    # Use a temp file for the body and capture output to file
    $body | Out-File -FilePath "$env:TEMP\req.json" -Encoding utf8
    
    $startTime = Get-Date
    $rawOutput = & curl.exe -s -X POST $url -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$(Get-Content -Path "$env:TEMP\req.json" -Raw -Encoding utf8)" 2>&1
    $endTime = Get-Date
    $totalLatency = ($endTime - $startTime).TotalMilliseconds
    
    # Save raw SSE output
    "`n--- RAW SSE RESPONSE ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    $rawOutput | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    # Parse SSE events
    $events = $rawOutput -split "data: "
    $fullReply = ""
    foreach ($event in $events) {
        $event = $event.Trim()
        if ($event -eq "") { continue }
        
        # Try to parse as JSON
        try {
            $parsed = $event | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($parsed) {
                "`n--- SSE EVENT ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
                $parsed | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Append -Encoding utf8
                
                # Extract reply text
                if ($parsed.type -eq "agent_reply" -and $parsed.reply) {
                    $fullReply = $parsed.reply
                }
                if ($parsed.type -eq "run_complete" -and $parsed.reply) {
                    if ($fullReply -eq "") { $fullReply = $parsed.reply }
                }
                if ($parsed.type -eq "chunk" -and $parsed.text) {
                    $fullReply += $parsed.text
                }
            }
        } catch {
            # Not JSON, it's raw SSE text
        }
    }
    
    # Summary section
    "`n--- SUMMARY ---" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Test: $testName" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Request: $msg" | Out-File -FilePath $outputFile -Append -Encoding utf8
    "Total Wall Clock Time: $([math]::Round($totalLatency)) ms" | Out-File -FilePath $outputFile -Append -Encoding utf8
    if ($fullReply -ne "") {
        "Agent Reply: $fullReply" | Out-File -FilePath $outputFile -Append -Encoding utf8
    }
    "--- END TEST $testName ---`n" | Out-File -FilePath $outputFile -Append -Encoding utf8
    
    Write-Host "  Done. Total time: $([math]::Round($totalLatency)) ms" -ForegroundColor Green
    
    # Small delay between tests
    Start-Sleep -Seconds 1
}

Write-Host "`nAll tests completed. Results saved to $outputFile" -ForegroundColor Yellow
