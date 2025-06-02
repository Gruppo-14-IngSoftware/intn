console.log('admin.js caricato!');

// Caricare gli utenti
fetch('/admin/users')
    .then(res => res.json())
    .then(users => {
        const list = document.getElementById('userList');
        users.forEach(u => {
            const temp = document.createElement('li');
            temp.textContent = u.username + " (" + u.email + ") – " + u.role;
            list.appendChild(temp);
        });
    });

// change role of a user (Promotion)
document.getElementById('promoteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('promoteEmail').value;
    const res = await fetch('/admin/promote', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include', // per inviare cookie di sessione
        body: JSON.stringify({ email })
    });

    const data = await res.json();
    document.getElementById('responseMsg').textContent = data.message || data.error;
});

// add admin
document.getElementById('addAdminForm').addEventListener('submit', async e => {
    e.preventDefault();
    
    const firstname = document.getElementById('newFirst').value;
    const lastname = document.getElementById('newLast').value;
    const birthdate = document.getElementById('newBirth').value;
    const username = document.getElementById('newUser').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPass').value;

    const res = await fetch('/admin/add', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ firstname, lastname, birthdate, username, email, password  })
    });

    const data = await res.json();
    document.getElementById('responseMsg').textContent = data.message || data.error;
});