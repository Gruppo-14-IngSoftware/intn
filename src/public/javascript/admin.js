//VISUALIZZAZIONE UTENTI (AI HELP)
fetch('/admin/users')
  .then(res => res.json())
  .then(users => {
    const list = document.getElementById('userList');
    users.forEach(u => {
      const row = document.createElement('tr');

      //USERNAME
      const usernameCell = document.createElement('td');
      usernameCell.textContent = u.username;
      row.appendChild(usernameCell);

      //EMAIL
      const emailCell = document.createElement('td');
      emailCell.textContent = u.email;
      row.appendChild(emailCell);

      //ROLE
      const roleCell = document.createElement('td');
      roleCell.textContent = u.role;
      row.appendChild(roleCell);

      //PROMOTE
      const promoteCell = document.createElement('td');
      const promoteButton = document.createElement('button');
      promoteButton.textContent = 'PROMOTE';
      promoteButton.disabled = u.role === 'admin';
      promoteButton.type = 'button';

      if (u.role !== 'admin') {
        promoteButton.addEventListener('click', () => {
          //INVIO DIRETTO AL BACKEND
          fetch('/admin/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: u.email })
          })
            .then(res => {
              if (!res.ok) throw new Error("Errore nella richiesta");
              return res.json();
            })
            .then(data => {
              // RICARICA PER AGGIORNARE LA TABELLA E MOSTRARE FLASH
              location.reload();
            })
            .catch(err => {
              console.error(err);
              alert("Errore nella promozione.");
            });
        });
      } else {
        promoteButton.style.backgroundColor = '#a0aec0';
        promoteButton.style.cursor = 'not-allowed';
      }

      promoteCell.appendChild(promoteButton);
      row.appendChild(promoteCell);

      list.appendChild(row);
    });
  });



document.addEventListener('DOMContentLoaded', () => {
    //FORM "AGGIUNGI ADMIN"
    const toggleLink = document.getElementById('toggleAddAdmin');
    const addAdminContainer = document.getElementById('addAdminContainer');
    if (toggleLink && addAdminContainer) {
      toggleLink.addEventListener('click', e => {
        e.preventDefault();
        addAdminContainer.style.display = addAdminContainer.style.display === 'none' ? 'block' : 'none';
      });
    }

    //FORM PROMOZIONE UTENTE
    const promoteForm = document.getElementById('promoteForm');
    if (promoteForm) {
      promoteForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('promoteEmail').value;
        try {
          const res = await fetch('/admin/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
          });

          const data = await res.json();
          document.getElementById('responseMsg').textContent = data.message || data.error;
        } catch (err) {
          document.getElementById('responseMsg').textContent = 'Errore di rete durante la promozione.';
        }
      });
    }

    //FORM AGGIUNTA ADMIN
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
    addAdminForm.addEventListener('submit', async e => {
        e.preventDefault();

        const firstname = document.getElementById('newFirst').value;
        const lastname = document.getElementById('newLast').value;
        const birthdate = document.getElementById('newBirth').value;
        const username = document.getElementById('newUser').value;
        const email = document.getElementById('newEmail').value;
        const password = document.getElementById('newPass').value;

        try {
        const res = await fetch('/admin/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ firstname, lastname, birthdate, username, email, password })
        });

        const data = await res.json();
        document.getElementById('responseMsg').textContent = data.message || data.error;

        if (res.ok && data.message) {
            setTimeout(() => location.reload(), 1000);
        }
        } catch (err) {
        document.getElementById('responseMsg').textContent = 'Errore di rete durante l\'aggiunta.';
        }
    });
    }
  });