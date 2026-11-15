$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$statusCode = 0
$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env.telegram.local'
$envText = [System.IO.File]::ReadAllText($envPath)
$tokenMatch = [regex]::Match($envText, '(?m)^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.*?)\s*$')
if (-not $tokenMatch.Success) { throw 'Telegram token is not configured.' }
$token = $tokenMatch.Groups[1].Value.Trim().Trim('"', "'")

if ($request.method -eq 'downloadFile') {
  $filePath = [string]$request.parameters.filePath
  if ($filePath -notmatch '^[A-Za-z0-9_./-]+$' -or $filePath.Contains('..')) {
    throw 'Telegram returned an invalid attachment path.'
  }
  $attachmentRoot = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSScriptRoot) '.local-data\attachments'))
  $destination = [System.IO.Path]::GetFullPath([string]$request.parameters.destination)
  if (-not $destination.StartsWith($attachmentRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Attachment destination is outside the private attachment folder.'
  }
  [System.IO.Directory]::CreateDirectory($attachmentRoot) | Out-Null
  $partialDestination = $destination + '.download'
  try {
    Remove-Item -LiteralPath $partialDestination -Force -ErrorAction SilentlyContinue
    $response = Invoke-WebRequest -UseBasicParsing -Uri ("https://api.telegram.org/file/bot{0}/{1}" -f $token, $filePath) -Method Get -TimeoutSec 35 -OutFile $partialDestination
    $statusCode = [int]$response.StatusCode
    $savedBytes = if (Test-Path -LiteralPath $partialDestination) { (Get-Item -LiteralPath $partialDestination).Length } else { 0 }
    Move-Item -LiteralPath $partialDestination -Destination $destination -Force
    $body = [ordered]@{ savedBytes = $savedBytes }
  } finally {
    Remove-Item -LiteralPath $partialDestination -Force -ErrorAction SilentlyContinue
  }
} else {
  $allowedMethods = @('getFile', 'getMe', 'getUpdates', 'getWebhookInfo', 'getChat', 'getChatMember', 'sendMessage', 'answerCallbackQuery', 'setMyCommands')
  if ($request.method -notin $allowedMethods) { throw 'Telegram API method is not allowed by the local receiver.' }
  $jsonBody = $request.parameters | ConvertTo-Json -Depth 30 -Compress
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri ("https://api.telegram.org/bot{0}/{1}" -f $token, $request.method) -Method Post -ContentType 'application/json; charset=utf-8' -Body $jsonBytes -TimeoutSec 35
    $statusCode = [int]$response.StatusCode
    try { $body = $response.Content | ConvertFrom-Json } catch { $body = [ordered]@{ ok = $false; description = 'Telegram returned an unreadable response.' } }
  } catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
      $statusCode = [int]$errorResponse.StatusCode
      try {
        $reader = [System.IO.StreamReader]::new($errorResponse.GetResponseStream())
        $responseContent = $reader.ReadToEnd()
        $reader.Dispose()
        $body = $responseContent | ConvertFrom-Json
      } catch {
        $body = [ordered]@{ ok = $false; description = 'Telegram returned an unreadable error response.' }
      }
    } else {
      $description = 'Windows network transport failed.'
      if ($_.Exception -is [System.Net.WebException]) {
        switch ([string]$_.Exception.Status) {
          'Timeout' { $description = 'Telegram network request timed out.' }
          'NameResolutionFailure' { $description = 'Telegram hostname could not be resolved.' }
          'ConnectFailure' { $description = 'Telegram connection could not be opened.' }
          'TrustFailure' { $description = 'Telegram TLS certificate validation failed.' }
          'SecureChannelFailure' { $description = 'Telegram TLS connection failed.' }
        }
      }
      $body = [ordered]@{ ok = $false; description = $description }
    }
  }
}

[ordered]@{ statusCode = $statusCode; body = $body } | ConvertTo-Json -Depth 30 -Compress
