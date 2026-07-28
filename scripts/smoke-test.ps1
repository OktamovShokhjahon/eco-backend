$ErrorActionPreference = "Stop"
$base = "http://localhost:5000/api"
$pass = 0
$fail = 0

function Check($name, $condition, $detail) {
    if ($condition) {
        Write-Host "  PASS  $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  $name  -> $detail" -ForegroundColor Red
        $script:fail++
    }
}

function Expect-Status($name, $expected, $scriptBlock) {
    try {
        & $scriptBlock | Out-Null
        Check $name $false "expected HTTP $expected but the call succeeded"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Check $name ($code -eq $expected) "expected HTTP $expected, got $code"
    }
}

Write-Host "`n--- health & public endpoints ---" -ForegroundColor Cyan
$health = Invoke-RestMethod "$base/health"
Check "GET /health returns ok" ($health.data.status -eq "ok") $health.data.status
Check "database connected" ($health.data.database -eq "connected") $health.data.database

$stats = Invoke-RestMethod "$base/stats"
Check "GET /stats activeUsers >= 8" ($stats.data.activeUsers -ge 8) $stats.data.activeUsers
Check "GET /stats tasksCompleted > 0" ($stats.data.tasksCompleted -gt 0) $stats.data.tasksCompleted
Check "GET /stats co2Saved > 0" ($stats.data.co2Saved -gt 0) $stats.data.co2Saved
Check "GET /stats treesPlanted computed" ($stats.data.treesPlanted -ge 0) $stats.data.treesPlanted

$tasks = Invoke-RestMethod "$base/tasks"
Check "GET /tasks returns 6" ($tasks.data.Count -eq 6) $tasks.data.Count
Check "anonymous tasks are not completed" (-not ($tasks.data | Where-Object { $_.completed })) "some marked complete"
Check "task exposes id (not _id)" ($null -ne $tasks.data[0].id) "missing id"
Check "task exposes key for i18n" ($tasks.data[0].key -match "^task\d$") $tasks.data[0].key

$filtered = Invoke-RestMethod "$base/tasks?category=waste"
Check "GET /tasks?category=waste filters" ($filtered.data.Count -eq 2) $filtered.data.Count

$products = Invoke-RestMethod "$base/products"
Check "GET /products returns 12" ($products.data.Count -eq 12) $products.data.Count
$soldOut = @($products.data | Where-Object { -not $_.inStock })
Check "one product is out of stock" ($soldOut.Count -eq 1) $soldOut.Count

$board = Invoke-RestMethod "$base/leaderboard?limit=8"
Check "GET /leaderboard returns 8" ($board.data.entries.Count -eq 8) $board.data.entries.Count
Check "leaderboard rank 1 first" ($board.data.entries[0].rank -eq 1) $board.data.entries[0].rank
Check "leaderboard sorted desc" ($board.data.entries[0].ecoPoints -ge $board.data.entries[1].ecoPoints) "not sorted"
Check "leaderboard entry has flat name" ($board.data.entries[0].name -match "\s") $board.data.entries[0].name

$week = Invoke-RestMethod "$base/leaderboard?period=week"
Check "GET /leaderboard?period=week works" ($week.data.entries.Count -gt 0) $week.data.entries.Count
Check "weekly totals < all-time" ($week.data.entries[0].ecoPoints -lt $board.data.entries[0].ecoPoints) "weekly not smaller"

$ach = Invoke-RestMethod "$base/achievements"
Check "GET /achievements returns 14" ($ach.data.achievements.Count -eq 14) $ach.data.achievements.Count
Check "anonymous unlockedCount = 0" ($ach.data.unlockedCount -eq 0) $ach.data.unlockedCount

Write-Host "`n--- validation & error handling ---" -ForegroundColor Cyan
Expect-Status "unknown route -> 404" 404 { Invoke-RestMethod "$base/does-not-exist" }
Expect-Status "GET /users/me without token -> 401" 401 { Invoke-RestMethod "$base/users/me" }
Expect-Status "bad login payload -> 422" 422 {
    Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"nope","password":""}'
}
Expect-Status "invalid credentials -> 401" 401 {
    Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"sarah.johnson@example.com","password":"wrong-password"}'
}
Expect-Status "bad task category -> 422" 422 { Invoke-RestMethod "$base/tasks?category=banana" }

Write-Host "`n--- register / login / me ---" -ForegroundColor Cyan
$email = "smoke-$(Get-Random)@example.com"
$body = @{
    firstName = "Smoke"; lastName = "Tester"; email = $email; password = "secret123"
    address   = "Tashkent, UZ"; age = "19"; status = "student"
} | ConvertTo-Json

$reg = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body $body
Check "register returns a token" ($reg.data.token.Length -gt 20) "no token"
Check "register coerces age string -> number" ($reg.data.user.age -eq 19) $reg.data.user.age
Check "new user starts at 0 points" ($reg.data.user.ecoPoints -eq 0) $reg.data.user.ecoPoints
Check "register never leaks passwordHash" ($null -eq $reg.data.user.passwordHash) "hash leaked!"

Expect-Status "duplicate email -> 409" 409 {
    Invoke-RestMethod "$base/auth/register" -Method Post -ContentType "application/json" -Body $body
}

$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = $email; password = "secret123" } | ConvertTo-Json)
Check "login succeeds" ($login.data.token.Length -gt 20) "no token"

$h = @{ Authorization = "Bearer $($login.data.token)" }
$me = Invoke-RestMethod "$base/auth/me" -Headers $h
Check "GET /auth/me returns the user" ($me.data.user.email -eq $email) $me.data.user.email

Write-Host "`n--- task completion, streaks, achievements ---" -ForegroundColor Cyan
$allTasks = (Invoke-RestMethod "$base/tasks" -Headers $h).data
$t1 = $allTasks[0]
$done = Invoke-RestMethod "$base/tasks/$($t1.id)/complete" -Method Post -Headers $h
Check "complete awards the task's points" ($done.data.pointsAwarded -eq $t1.points) $done.data.pointsAwarded
Check "balance increased" ($done.data.user.ecoPoints -ge $t1.points) $done.data.user.ecoPoints
Check "completedTasks = 1" ($done.data.user.completedTasks -eq 1) $done.data.user.completedTasks
Check "streak started at 1" ($done.data.currentStreak -eq 1) $done.data.currentStreak
Check "'First Step' badge unlocked" ($done.data.newAchievements.key -contains "first_step") ($done.data.newAchievements.key -join ",")
Check "badge bonus added on top" ($done.data.user.ecoPoints -eq ($t1.points + 25)) $done.data.user.ecoPoints
Check "co2Saved recorded" ($done.data.user.co2Saved -gt 0) $done.data.user.co2Saved

Expect-Status "same task twice in one day -> 409" 409 {
    Invoke-RestMethod "$base/tasks/$($t1.id)/complete" -Method Post -Headers $h
}

$after = (Invoke-RestMethod "$base/tasks" -Headers $h).data | Where-Object { $_.id -eq $t1.id }
Check "task now reports completed=true for this user" ($after.completed -eq $true) $after.completed

$hist = Invoke-RestMethod "$base/tasks/history" -Headers $h
Check "history has 1 entry" ($hist.data.Count -eq 1) $hist.data.Count
Check "history includes the task" ($hist.data[0].task.key -eq $t1.key) $hist.data[0].task.key

$myStats = Invoke-RestMethod "$base/users/me/stats" -Headers $h
Check "stats todayCompleted = 1 of 6" ($myStats.data.todayCompleted -eq 1 -and $myStats.data.todayTotal -eq 6) "$($myStats.data.todayCompleted)/$($myStats.data.todayTotal)"
Check "stats returns a rank" ($myStats.data.rank -ge 1) $myStats.data.rank

$rank = Invoke-RestMethod "$base/leaderboard/me" -Headers $h
Check "GET /leaderboard/me returns neighbours" ($rank.data.neighbours.Count -gt 0) $rank.data.neighbours.Count

Write-Host "`n--- undo ---" -ForegroundColor Cyan
$t2 = $allTasks[1]
Invoke-RestMethod "$base/tasks/$($t2.id)/complete" -Method Post -Headers $h | Out-Null
$undo = Invoke-RestMethod "$base/tasks/$($t2.id)/complete" -Method Delete -Headers $h
Check "undo removes the points" ($undo.data.pointsRemoved -eq $t2.points) $undo.data.pointsRemoved
Check "undo restores completedTasks to 1" ($undo.data.user.completedTasks -eq 1) $undo.data.user.completedTasks
Expect-Status "undo when not completed -> 404" 404 {
    Invoke-RestMethod "$base/tasks/$($t2.id)/complete" -Method Delete -Headers $h
}
Check "task can be re-completed after undo" ((Invoke-RestMethod "$base/tasks/$($t2.id)/complete" -Method Post -Headers $h).data.pointsAwarded -eq $t2.points) "re-complete failed"

Write-Host "`n--- store purchases ---" -ForegroundColor Cyan
$cheap = (Invoke-RestMethod "$base/products").data | Where-Object { $_.inStock } | Sort-Object price | Select-Object -First 1
$stockBefore = $cheap.stock
$balanceBefore = (Invoke-RestMethod "$base/auth/me" -Headers $h).data.user.ecoPoints

Expect-Status "buying beyond your balance -> 400" 400 {
    $rich = (Invoke-RestMethod "$base/products").data | Where-Object { $_.inStock } | Sort-Object price -Descending | Select-Object -First 1
    Invoke-RestMethod "$base/orders" -Method Post -Headers $h -ContentType "application/json" -Body (@{ productId = $rich.id } | ConvertTo-Json)
}

$balanceAfterFailed = (Invoke-RestMethod "$base/auth/me" -Headers $h).data.user.ecoPoints
Check "failed purchase did not charge" ($balanceAfterFailed -eq $balanceBefore) "$balanceBefore -> $balanceAfterFailed"
$stockAfterFailed = ((Invoke-RestMethod "$base/products").data | Where-Object { $_.id -eq $cheap.id }).stock
Check "failed purchase rolled stock back" ($stockAfterFailed -eq $stockBefore) "$stockBefore -> $stockAfterFailed"

# Earn enough to afford the cheapest item.
foreach ($t in $allTasks) {
    try { Invoke-RestMethod "$base/tasks/$($t.id)/complete" -Method Post -Headers $h | Out-Null } catch {}
}
$balanceBefore = (Invoke-RestMethod "$base/auth/me" -Headers $h).data.user.ecoPoints
$expectedPrice = if ($cheap.discount) { [math]::Floor($cheap.price * (1 - $cheap.discount / 100)) } else { $cheap.price }

$order = Invoke-RestMethod "$base/orders" -Method Post -Headers $h -ContentType "application/json" -Body (@{ productId = $cheap.id } | ConvertTo-Json)
Check "purchase charges the discounted price" ($order.data.pricePaid -eq $expectedPrice) "$($order.data.pricePaid) vs $expectedPrice"
# The purchase also unlocks "First Reward", whose bonus lands in the same response.
$bonus = ($order.data.newAchievements | Measure-Object -Property rewardPoints -Sum).Sum
Check "balance = before - price + badge bonus" ($order.data.user.ecoPoints -eq ($balanceBefore - $expectedPrice + $bonus)) "$balanceBefore - $expectedPrice + $bonus vs $($order.data.user.ecoPoints)"
Check "stock decremented" ($order.data.product.stock -eq ($stockBefore - 1)) $order.data.product.stock
Check "'First Reward' badge unlocked" ($order.data.newAchievements.key -contains "first_reward") ($order.data.newAchievements.key -join ",")
Check "order snapshots the product name" ($order.data.order.productSnapshot.name -eq $cheap.name) $order.data.order.productSnapshot.name

$orders = Invoke-RestMethod "$base/orders" -Headers $h
Check "GET /orders lists the purchase" ($orders.data.count -eq 1) $orders.data.count
Check "GET /orders totals the spend" ($orders.data.totalSpent -eq $expectedPrice) $orders.data.totalSpent

$soldOutId = ((Invoke-RestMethod "$base/products").data | Where-Object { -not $_.inStock })[0].id
Expect-Status "buying an out-of-stock item -> 409" 409 {
    Invoke-RestMethod "$base/orders" -Method Post -Headers $h -ContentType "application/json" -Body (@{ productId = $soldOutId } | ConvertTo-Json)
}
Expect-Status "invalid productId -> 422" 422 {
    Invoke-RestMethod "$base/orders" -Method Post -Headers $h -ContentType "application/json" -Body '{"productId":"not-an-id"}'
}

Write-Host "`n--- profile updates ---" -ForegroundColor Cyan
$upd = Invoke-RestMethod "$base/users/me" -Method Patch -Headers $h -ContentType "application/json" -Body (@{ address = "Samarkand, UZ"; age = 20 } | ConvertTo-Json)
Check "PATCH /users/me updates fields" ($upd.data.user.address -eq "Samarkand, UZ" -and $upd.data.user.age -eq 20) $upd.data.user.address
Expect-Status "wrong current password -> 400" 400 {
    Invoke-RestMethod "$base/users/me/password" -Method Patch -Headers $h -ContentType "application/json" -Body (@{ currentPassword = "nope"; newPassword = "abcdef1" } | ConvertTo-Json)
}
Invoke-RestMethod "$base/users/me/password" -Method Patch -Headers $h -ContentType "application/json" -Body (@{ currentPassword = "secret123"; newPassword = "newsecret123" } | ConvertTo-Json) | Out-Null
$relogin = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = $email; password = "newsecret123" } | ConvertTo-Json)
Check "login works with the new password" ($relogin.data.token.Length -gt 20) "no token"

$authedAch = Invoke-RestMethod "$base/achievements" -Headers $h
Check "achievements report unlocked badges" ($authedAch.data.unlockedCount -ge 2) $authedAch.data.unlockedCount
Check "achievements report progress" ($null -ne ($authedAch.data.achievements | Where-Object { $_.progress -gt 0 })) "no progress"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  PASSED: $pass    FAILED: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "=========================================`n" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
