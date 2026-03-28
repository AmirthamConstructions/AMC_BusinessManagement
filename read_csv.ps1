$csvDir = "c:\Users\901465\AMC\AMC_BusinessManagement\CSV"
$files = Get-ChildItem -Path $csvDir -Filter "*.csv"
foreach ($f in $files) {
    Write-Host ("=== " + $f.Name + " ===")
    Get-Content $f.FullName -TotalCount 3
    Write-Host ""
}
