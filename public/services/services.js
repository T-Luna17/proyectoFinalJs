const API_URL = 'http://localhost:3001';

// Obtener datos de un endpoint
export async function getData(endpoint) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`);
        if (!response.ok) {
            throw new Error('Error al obtener los datos');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en getData:', error);
        return [];
    }
}

// Agregar un nuevo registro
export async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Error al enviar los datos');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en postData:', error);
    }
}

// Actualizar un registro por ID
export async function updateData(endpoint, id, data) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Error al actualizar los datos');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en updateData:', error);
    }
}

// Eliminar un registro por ID
export async function deleteData(endpoint, id) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Error al eliminar el dato');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en deleteData:', error);
    }
}
