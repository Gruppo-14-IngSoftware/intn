//Caricare gli utenti
fetch('/amdin/users')
    .then(res => res.json())
    .then(users => {
        const list = document.getElementById('userList');
        users.forEach(u => {
            const temp = document.createElement('temp');
            temp.textContent = u.name + " (" + u.email + ") – " + u.role;
            list.appendChild(temp);
        });
    });

//change role of a user (Promotion)
document.getElementById('promoteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('promoteEmail').ariaValueMax;
    const res = await fetch('/admin/promote', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email})
    });

    const data = await res.json();
    document.getElementById('responseMsg').textContent = data.message || data.error;
});

//add admin
document.getElementById('addAdminForm').addEventListener('submit', async e => {
    e.preventDefault();
    
    const firstname = document.getElementById('newFirst').value;
    const lastname = document.getElementById('newLast').value;
    const birthdate = document.getElementById('newBirth').value;
    const name = document.getElementById('newUser').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPass').value;

    const res = await fetch('/admin/add', {
        method: 'POST', 
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify({firstname, lastname, birthdate, name, email, password})
    });

    const data = await  res.json();
    document.getElementById('responseMsg').textContent = data.message || data.error;
});