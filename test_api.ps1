$body = '{"username":"testuser99","password":"123456","displayName":"TestUser"}'
try {
    $r = Invoke-WebRequest -Uri 'https://sudoku-game-online.onrender.com/api/auth/register' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Body: $($r.Content)"
} catch {
    Write-Host "HTTP Error: $($_.Exception.Message)"
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body: $($reader.ReadToEnd())"
    } catch {
        Write-Host "Cannot read response body"
    }
}
