import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
    import { getFirestore, collection, getDocs, doc, updateDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

    const firebaseConfig = {
            apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
            authDomain: "taga-cuyo-app.firebaseapp.com",
            projectId: "taga-cuyo-app",
            storageBucket: "taga-cuyo-app.firebasestorage.app",
            messagingSenderId: "908851804845",
            appId: "1:908851804845:web:dff839dc552a573a23a424",
            measurementId: "G-NVSY2HPNX4"
        };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const activitiesRef = collection(db, "activities");

    let isLoggingOut = false;

    // Monitor authentication state
    

  // Load history records from the 'history' collection
  async function loadActivities() {
    const tableBody = document.querySelector("tbody");
    tableBody.innerHTML = ""; // Clear table before loading

    const activitiesSnapshot = await getDocs(activitiesRef);
    const activities = [];

    activitiesSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        activities.push({ ...data, id: docSnap.id });
    });

    // Sort activities by timestamp (latest first)
    activities.sort((a, b) => (b.timestamp?.toDate() - a.timestamp?.toDate()));

    activities.forEach((activity) => {
        const row = document.createElement("tr");

        // Determine action content
        const wordDisplay = activity.word || "No word provided";
        const translatedDisplay = activity.translated || "No translation available";

        // Check approval and dismissal status
        let statusDisplay;
        let statusClass;

        if (activity.dismissed) {
            statusDisplay = "Dismissed";
            statusClass = "status-dismissed"; // Red
        } else if (activity.isApprove) {
            statusDisplay = "Approved";
            statusClass = "status-approved"; // Green
        } else {
            statusDisplay = "Pending...";
            statusClass = "status-pending"; // Yellow
        }

        row.innerHTML = `
            <td>${activity.action}</td>
            <td>${activity.timestamp?.toDate().toLocaleString() || "No timestamp"}</td>
            <td class="${statusClass}">${statusDisplay}</td>
            <td>${activity.addedBy || "Unknown"}</td>
            <td>${wordDisplay}</td>
            <td>${translatedDisplay}</td>
            <td>
                <button class="delete-btn" data-id="${activity.id}" style="color: red; background: none; border: none; cursor: pointer;">
                    <i class="bx bxs-trash"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    addDeleteListeners();
}

// Function to handle delete action
function addDeleteListeners() {
    const deleteButtons = document.querySelectorAll(".delete-btn");

    deleteButtons.forEach((button) => {
        button.addEventListener("click", async (event) => {
            const docId = event.target.closest("button").dataset.id;

            if (confirm("Are you sure you want to delete this entry?")) {
                try {
                    await deleteDoc(doc(db, "activities", docId)); // Delete from Firestore
                    event.target.closest("tr").remove(); // Remove from table
                    alert("Entry deleted successfully!");
                } catch (error) {
                    console.error("Error deleting entry:", error);
                    alert("Failed to delete the entry.");
                }
            }
        });
    });
}

// Load activities when the page loads
window.addEventListener("DOMContentLoaded", loadActivities);

function listenForNotifications() {
  const activitiesRef = collection(db, 'activities');

  onSnapshot(activitiesRef, (snapshot) => {
    const notifications = [];
    let hasNewNotifications = false;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;

      // **Only show approved notifications that haven't been seen**
      if (data.isApprove && !data.isSeen) {
        hasNewNotifications = true;

        notifications.push(`
          <p data-id="${docId}" class="notification-item">
            <span class="notification-link">
              <strong>Action:</strong> ${data.action} <br>
              <strong>Added By:</strong> ${data.addedBy} <br>
              <strong>Status:</strong> Approved <br>
            </span>
          </p>
          <hr>
        `);
      }
    });

    // **Update UI**
    if (notifications.length > 0) {
      notificationDot.style.display = 'block'; // Show red dot
      notificationDropdown.innerHTML = notifications.join('');
    } else {
      notificationDot.style.display = 'none'; // Hide red dot
      notificationDropdown.innerHTML = '<p>No new notifications</p>';
    }

    // **Click event to mark as seen and remove**
    document.querySelectorAll('.notification-item').forEach((item) => {
      item.addEventListener('click', async (event) => {
        const notificationId = event.currentTarget.dataset.id;

        // Remove from UI
        event.currentTarget.remove();

        // If no more notifications, hide the red dot
        if (document.querySelectorAll('.notification-item').length === 0) {
          notificationDot.style.display = 'none';
          notificationDropdown.innerHTML = '<p>No new notifications</p>';
        }

        // **Update Firestore to mark notification as seen**
        const notificationRef = doc(db, 'activities', notificationId);
        await updateDoc(notificationRef, { isSeen: true });
      });
    });
  });
}

// **Start listening for notifications**
listenForNotifications();


// **Mark notifications as seen when the dropdown is clicked**
notificationWrapper.addEventListener('click', () => {
  notificationDropdown.classList.toggle('active');

  // Hide the red dot and mark notifications as seen
  notificationDot.style.display = 'none';
  localStorage.setItem('notificationsSeen', 'true');
});

// **Check notification state when the page loads**
if (localStorage.getItem('notificationsSeen') === 'true') {
  notificationDot.style.display = 'none'; // Ensure red dot stays hidden if already seen
}

// **Start listening for notifications**
listenForNotifications();



// Approve or delete content based on admin action
async function approveContent(docId, approveButton, action) {
    try {
        const docRef = doc(db, 'activities', docId);

        if (action === 'delete') {
            // Mark the deletion as approved and update the Firestore document
            await updateDoc(docRef, { isApprove: true, dismissed: true });

            const row = approveButton.closest('tr');

            // Ensure that the row has the necessary columns
            const statusCell = row.querySelector('td:nth-child(3)'); // Status column
            const wordCell = row.querySelector('td:nth-child(5)'); // Word column
            const translatedCell = row.querySelector('td:nth-child(6)'); // Translated Word column

            if (statusCell && wordCell && translatedCell) {
                // Change status and the word content to indicate deletion
                statusCell.textContent = 'Approved (Deleted)';
                statusCell.classList.replace('status-pending', 'status-approved'); // Update status to approved
                wordCell.innerHTML = '<span>Deleted</span>';  // Mark word as deleted
                translatedCell.innerHTML = '<span>Deleted</span>'; // Mark translated word as deleted
            }

            alert("Content marked as deleted and approved.");
        } else {
            // If it's not a delete action, just approve the content
            await updateDoc(docRef, { isApprove: true });

            const statusCell = approveButton.closest('tr').querySelector('.status-pending');
            const approveCell = approveButton.closest('tr').querySelector('td:last-child');

            if (statusCell) {
                statusCell.textContent = 'Approved';
            }
            if (approveCell) {
                approveCell.innerHTML = '<span>Accepted</span>';
            }

            alert("Content approved.");
        }

        // Remove the approve button after action (if you want)
        approveButton.remove();

    } catch (error) {
        console.error("Error approving content:", error);
        alert("Failed to approve content.");
    }
}








  


   