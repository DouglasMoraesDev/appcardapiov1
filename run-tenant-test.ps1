$ErrorActionPreference='Stop'

$est = Invoke-RestMethod -Uri 'http://localhost:4000/api/establishment' -Method Get -UseBasicParsing
Write-Output '---ESTABLISHMENT---'
$est | ConvertTo-Json -Depth 5

if ($est -and $est.id) {
  Write-Output '---EST ID---'
  $id = $est.id
  Write-Output $id
} else { Write-Output '---NO EST ID---' }

# Create table
$body = @{ number = 999 }
if ($id) {
  Write-Output 'Creating table with tenant header'
  $t = Invoke-RestMethod -Uri 'http://localhost:4000/api/tables' -Method Post -Body ($body | ConvertTo-Json) -ContentType 'application/json' -Headers @{ 'X-Establishment-Id' = $id }
} else {
  Write-Output 'Creating table without tenant header'
  $t = Invoke-RestMethod -Uri 'http://localhost:4000/api/tables' -Method Post -Body ($body | ConvertTo-Json) -ContentType 'application/json'
}
Write-Output 'Created table:'
$t | ConvertTo-Json -Depth 5

Write-Output '---Tables List---'
if ($id) { $tables = Invoke-RestMethod -Uri 'http://localhost:4000/api/tables' -Method Get -Headers @{ 'X-Establishment-Id' = $id } } else { $tables = Invoke-RestMethod -Uri 'http://localhost:4000/api/tables' -Method Get }
$tables | ConvertTo-Json -Depth 5

$tid = ($tables | Where-Object { $_.number -eq 999 }).id
Write-Output "Found table id: $tid"

if ($tid) {
  $orderBody = @{ tableId = [int]$tid; items = @(@{ name='Test Item'; price=1.5; quantity=2 }); total = 3 }
  Write-Output 'Creating order'
  $ord = Invoke-RestMethod -Uri 'http://localhost:4000/api/orders' -Method Post -Body ($orderBody | ConvertTo-Json -Depth 5) -ContentType 'application/json'
  Write-Output 'Created order:'
  $ord | ConvertTo-Json -Depth 5
  Write-Output 'Fetch orders for table:'
  $res = Invoke-RestMethod -Uri "http://localhost:4000/api/orders?tableId=$tid" -Method Get
  $res | ConvertTo-Json -Depth 5
} else { Write-Output 'No table id found' }
