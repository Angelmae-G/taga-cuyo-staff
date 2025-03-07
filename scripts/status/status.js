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

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Check if the activity is approved, rejected, or pending
      if (data.isApprove !== null) {
        hasNewNotifications = true;

        // Determine the redirection link based on the action and type
        let redirectLink = '#'; // Default fallback link
        if (data.isApprove) {
          if (data.action.includes('Added word in Lesson')) {
            redirectLink = 'lesson.html'; // Replace with your lesson page URL
          } else if (data.action.includes('Added word in Category')) {
            redirectLink = 'category.html'; // Replace with your category page URL
          }
        } else {
          // Pending actions go to the status page
          redirectLink = 'status.html'; // Replace with your status page URL
        }

        // Add notification with a clickable link
        notifications.push({
          content: `
            <p>
              <a href="${redirectLink}" class="notification-link">
                <strong>Action:</strong> ${data.action} <br>
                <strong>Added By:</strong> ${data.addedBy} <br>
                <strong>Status:</strong> ${data.isApprove ? 'Accepted' : 'Pending'} <br>
              </a>
            </p>
            <hr>
          `,
          timestamp: data.timestamp, // Use this field for sorting
        });
      }
    });

    // Sort notifications by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp - a.timestamp);

    // Update the UI based on whether the user has already seen notifications
    const notificationsSeen = localStorage.getItem('notificationsSeen') === 'true';

    if (hasNewNotifications && !notificationsSeen) {
      notificationDot.style.display = 'block'; // Show red dot
      notificationDropdown.innerHTML = notifications.map((n) => n.content).join('');
    } else {
      notificationDot.style.display = 'none'; // Hide red dot
      notificationDropdown.innerHTML = hasNewNotifications
        ? notifications.map((n) => n.content).join('')
        : '<p>No new notifications</p>';
    }
  });
}

// Mark notifications as seen when the dropdown is clicked
notificationWrapper.addEventListener('click', () => {
  notificationDropdown.classList.toggle('active');

  // Hide the red dot and mark notifications as seen in localStorage
  notificationDot.style.display = 'none';
  localStorage.setItem('notificationsSeen', 'true');
});

// Check the state of notifications when the page loads
if (localStorage.getItem('notificationsSeen') === 'true') {
  notificationDot.style.display = 'none'; // Ensure the red dot is hidden
}

// Start listening for notifications
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








  


   