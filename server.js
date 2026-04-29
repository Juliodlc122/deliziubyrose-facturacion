const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const JWT_SECRET = 'super_secreto_123';
const DATA_FILE = path.join(__dirname, 'data.json');

// Función para inicializar y leer datos
function initData() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = { users: [], invoices: [] };
        
        // Aquí está configurado tu usuario maestro automático
        const hash = bcrypt.hashSync('RoEnMiJu1966', 10);
        defaultData.users.push({ 
            id: 1, 
            username: 'Deliziubyrose', 
            password: hash, 
            role: 'admin' 
        });
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
        console.log('Base de datos creada. Usuario administrador: Deliziubyrose configurado ✅');
    }
}
initData();

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Rutas de Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const user = data.users.find(u => u.username === username);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role }); 
});

// Middleware de Autenticación
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No autorizado' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(403).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar si es Admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden hacer esto' });
    }
    next();
};

// Crear Empleados (Solo Admin)
app.post('/api/users', auth, isAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    const data = readData();
    
    if (data.users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now(),
        username,
        password: hash,
        role: role || 'user'
    };
    
    data.users.push(newUser);
    writeData(data);
    res.json({ message: 'Usuario creado exitosamente' });
});

// Cambiar Contraseña
app.put('/api/change-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const data = readData();
    const userIndex = data.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

    const validPassword = await bcrypt.compare(oldPassword, data.users[userIndex].password);
    if (!validPassword) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    data.users[userIndex].password = await bcrypt.hash(newPassword, 10);
    writeData(data);
    res.json({ message: 'Contraseña actualizada correctamente' });
});

// Guardar y Obtener Facturas
app.post('/api/invoices', auth, (req, res) => {
    const data = readData();
    const newInvoice = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
    data.invoices.push(newInvoice);
    writeData(data);
    res.json({ message: 'Factura guardada' });
});

app.get('/api/invoices', auth, (req, res) => {
    const data = readData();
    res.json(data.invoices.reverse());
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));