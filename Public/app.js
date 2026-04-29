document.getElementById('date').valueAsDate = new Date();
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
document.getElementById('deliveryDate').valueAsDate = nextWeek;

if (localStorage.getItem('token')) {
    showScreen('dashboard-screen');
    checkRoleUI();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function checkRoleUI() {
    const role = localStorage.getItem('role');
    document.getElementById('admin-panel').style.display = (role === 'admin') ? 'block' : 'none';
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        showScreen('dashboard-screen');
        checkRoleUI();
    } else {
        alert("Usuario o clave incorrecta.");
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

async function createUser() {
    const newUser = document.getElementById('new-user').value;
    const newPass = document.getElementById('new-pass').value;
    const role = document.getElementById('new-role').value;
    const token = localStorage.getItem('token');

    const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ username: newUser, password: newPass, role })
    });
    
    if (res.ok) {
        alert('Usuario creado correctamente');
        document.getElementById('new-user').value = '';
        document.getElementById('new-pass').value = '';
    } else {
        const data = await res.json();
        alert(data.error);
    }
}

function addItem() {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
        <input type="text" class="desc" placeholder="Descripción">
        <input type="number" class="qty" value="1" min="1">
        <input type="number" class="price" placeholder="Precio">
    `;
    container.appendChild(div);
}

function generateInvoice() {
    const docType = document.getElementById('docType').value;
    const wa = document.getElementById('waInput').value;
    const ig = document.getElementById('igInput').value;

    const clientName = document.getElementById('clientName').value;
    const clientInfo = document.getElementById('clientInfo').value;
    const date = document.getElementById('date').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    
    let subtotal = 0;
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.desc').value;
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        const total = qty * price;
        if (desc) {
            items.push({ description: desc, qty, price, total });
            subtotal += total;
        }
    });

    document.getElementById('out-docType').innerText = docType.toUpperCase();
    document.getElementById('out-wa').innerText = wa;
    document.getElementById('out-ig').innerText = ig;

    document.getElementById('out-clientName').innerText = clientName || '---';
    document.getElementById('out-clientInfo').innerText = clientInfo || '---';
    document.getElementById('out-date').innerText = date;
    document.getElementById('out-deliveryDate').innerText = deliveryDate || '---';
    document.getElementById('out-subtotal').innerText = subtotal.toFixed(2);

    const tbody = document.getElementById('out-items');
    tbody.innerHTML = '';
    items.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.description}</td><td>${item.qty}</td><td>$${item.price}</td><td>$${item.total.toFixed(2)}</td></tr>`;
    });

    return { docType, clientName, subtotal };
}

async function saveAndDownloadPDF() {
    const info = generateInvoice();
    const token = localStorage.getItem('token');
    
    await fetch('/api/invoices', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(info)
    });

    const element = document.getElementById('invoice-preview');
    const opt = {
        margin: 10,
        filename: `${info.docType}_${info.clientName || 'Cliente'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function downloadImage() {
    const info = generateInvoice();
    const element = document.getElementById('invoice-preview');
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${info.docType}_${info.clientName || 'Cliente'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

async function changePassword() {
    const oldPassword = document.getElementById('old-pass').value;
    const newPassword = document.getElementById('new-pass').value;
    const token = localStorage.getItem('token');

    const res = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
    });

    if (res.ok) {
        alert('Contraseña cambiada.');
        document.getElementById('old-pass').value = '';
        document.getElementById('new-pass').value = '';
    } else {
        const data = await res.json();
        alert(data.error);
    }
}