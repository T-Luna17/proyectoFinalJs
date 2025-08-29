const API_URL = 'http://localhost:3001';

export async function getUsuarios() {
    const res = await fetch(${API_URL}/usuarios);
    return res.json();
}

export async function postUsuario(data) {
    await fetch(${API_URL}/usuarios, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}