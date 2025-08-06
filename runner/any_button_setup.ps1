param(
  [ValidateSet("install", "uninstall")]
  [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$extensionId = "begbpkhegofidiiagmkpbifennmpenhg"
$appName = "Any Button"
$binaryName = "any_button.exe"
$hostName = "com.any_button_runner"

$installDir = "C:\Program Files\$appName"
$binaryPath = Join-Path $installDir $binaryName
$manifestPath = Join-Path $installDir "$hostName.json"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"

if ($Action -eq "install") {
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir | Out-Null
    }

    if (-not (Test-Path ".\$binaryName")) {
        Write-Error "'$binaryName' not found in current directory!"
        exit 1
    }
    Copy-Item ".\$binaryName" -Destination $binaryPath -Force

    $manifest = @{
        name = $hostName
        description = "Runs shell commands for AnyButton"
        path = $binaryPath
        type = "stdio"
        allowed_origins = @("chrome-extension://$extensionId/")
    } | ConvertTo-Json -Depth 4

    Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8

    New-Item -Path $registryPath -Force | Out-Null
    Set-ItemProperty -Path $registryPath -Name "(default)" -Value $manifestPath

    Write-Host "Installed AnyButton runner."

} elseif ($Action -eq "uninstall") {
    if (Test-Path $registryPath) {
        Remove-Item -Path $registryPath -Force
        Write-Host "Registry key removed"
    }

    if (Test-Path $installDir) {
        Remove-Item -Path $installDir -Recurse -Force
        Write-Host "Install directory removed"
    }

    Write-Host "Uninstalled AnyButton runner."
}