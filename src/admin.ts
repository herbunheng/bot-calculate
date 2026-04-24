import { Env } from './types';

// 1. JSON API for the Dashboard
export async function handleAdminStats(env: Env): Promise<Response> {
	const users = await env.DB.prepare('SELECT * FROM users ORDER BY registered_at DESC').all();
	const stats = await env.DB.prepare('SELECT COUNT(*) as total_users FROM users').first();
	const trxStats = await env.DB.prepare('SELECT COUNT(*) as total_trx, SUM(amount) as total_amount FROM transactions').first();

	return new Response(JSON.stringify({
		users: users.results || [],
		stats: {
			total_users: stats?.total_users || 0,
			total_trx: trxStats?.total_trx || 0,
		}
	}), {
		headers: { 'Content-Type': 'application/json' },
	});
}

// 2. Serve the static UI
export async function handleAdminPage(): Promise<Response> {
	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Calculate | Admin Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #8b5cf6;
            --secondary: #d946ef;
            --bg: #0f172a;
            --card: rgba(30, 41, 59, 0.7);
            --text: #f8fafc;
            --accent: #22d3ee;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }

        body {
            background-color: var(--bg);
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, rgba(217, 70, 239, 0.15) 0%, transparent 40%);
            color: var(--text);
            min-height: 100vh;
            padding: 2rem;
        }

        .container { max-width: 1000px; margin: 0 auto; }

        header { margin-bottom: 3rem; text-align: center; animation: fadeInDown 0.8s ease-out; }

        h1 {
            font-size: 2.5rem;
            font-weight: 600;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }

        .stat-card {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 1.5rem;
            text-align: center;
            transition: transform 0.3s ease;
            animation: fadeInUp 0.8s ease-out backwards;
        }

        .stat-card:hover { transform: translateY(-5px); border-color: var(--primary); }

        .stat-card h3 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 0.5rem; }

        .stat-card p { font-size: 2.2rem; font-weight: 600; color: var(--accent); }

        .table-container {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.5rem;
            overflow: hidden;
            animation: fadeInUp 1s ease-out 0.2s backwards;
        }

        table { width: 100%; border-collapse: collapse; }

        th { background: rgba(255, 255, 255, 0.05); padding: 1.2rem; text-align: left; font-size: 0.9rem; color: #94a3b8; }

        td { padding: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }

        .username { font-weight: 600; color: var(--primary); }

        .loading { text-align: center; padding: 3rem; color: var(--primary); font-size: 1.2rem; }

        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Bot Calculate Admin</h1>
            <p>Real-time analytics and user management</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Users</h3>
                <p id="total-users">...</p>
            </div>
            <div class="stat-card">
                <h3>Total Transactions</h3>
                <p id="total-trx">...</p>
            </div>
            <div class="stat-card">
                <h3>System Status</h3>
                <p id="status" style="font-size: 1.2rem; color: #10b981;">Online</p>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>User ID</th>
                        <th>Registered At</th>
                    </tr>
                </thead>
                <tbody id="user-list">
                    <tr><td colspan="3" class="loading">Loading data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        async function loadStats() {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();

                document.getElementById('total-users').innerText = data.stats.total_users;
                document.getElementById('total-trx').innerText = data.stats.total_trx;

                const list = document.getElementById('user-list');
                list.innerHTML = data.users.map(u => \`
                    <tr>
                        <td><span class="username">@\${u.username || 'unknown'}</span></td>
                        <td><span style="color: #94a3b8; font-family: monospace;">\${u.user_id}</span></td>
                        <td>\${new Date(u.registered_at).toLocaleString()}</td>
                    </tr>
                \`).join('');

                if (data.users.length === 0) {
                    list.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem;">No users found yet.</td></tr>';
                }
            } catch (err) {
                console.error('Failed to load stats:', err);
                document.getElementById('user-list').innerHTML = '<tr><td colspan="3" style="color: #ef4444; text-align:center; padding: 2rem;">Error loading data.</td></tr>';
            }
        }

        loadStats();
        // Refresh every 30 seconds
        setInterval(loadStats, 30000);
    </script>
</body>
</html>
	`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	});
}
