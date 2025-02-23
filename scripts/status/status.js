import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
    import { getFirestore, collection, getDocs, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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
    let isLoggingOut = false;

    // Monitor authentication state
    onAuthStateChanged(auth, (user) => {
        if (isLoggingOut) return; // Prevent handling state change if logging out

        if (user) {
            console.log("User is signed in:", user.email);
        } else {
            console.log("No user is signed in.");
            alert("Please log in to continue.");
            window.location.href = "staff_login.html"; // Redirect to login page if not signed in
        }
    });

  // Load history records from the 'history' collection
async function loadHistory() {
    const historySnapshot = await getDocs(collection(db, 'history'));
    const historyTableBody = document.querySelector('#historyTable tbody'); // Assuming a table with ID 'historyTable'

    historySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${data.action}</td>
            <td>${data.contentType || 'Unknown'}</td>
            <td>${data.dismissedReason || 'No reason provided'}</td>
            <td>${data.user}</td>
            <td>${data.timestamp?.toDate().toLocaleString() || 'No timestamp'}</td>
        `;

        historyTableBody.appendChild(row);
    });
}

document.addEventListener("DOMContentLoaded", loadHistory);
const notificationDot = document.getElementById('notificationDot');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationWrapper = document.getElementById('notificationWrapper');


 // Load pending and dismissed content on page load
 async function loadPendingContent() {
    const activitiesSnapshot = await getDocs(collection(db, 'activities'));
    const tableBody = document.querySelector('tbody');
    tableBody.innerHTML = '';  // Clear the table before repopulating it

    const activities = [];
    activitiesSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        activities.push({ ...data, id: docSnapshot.id });
    });

    // Sort activities by timestamp (latest first)
    activities.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());

    activities.forEach((activity) => {
        const row = document.createElement('tr');
        const rowId = activity.id;  // Save the doc ID for later use

        console.log(activity);

        // Determine action content
        const wordDisplay = activity.word || 'No word provided';
        const translatedDisplay = activity.translated || 'No translation available';

        // Check approval and dismissal status
        let statusDisplay;
        let statusClass; // Use this variable to assign a CSS class

        if (activity.dismissed) {
            statusDisplay = 'Dismissed';
            statusClass = 'status-dismissed'; // Red
        } else if (activity.isApprove) {
            statusDisplay = 'Approved';
            statusClass = 'status-approved'; // Green
        } else {
            statusDisplay = 'Pending...';
            statusClass = 'status-pending'; // Yellow
        }

        row.innerHTML = `
            <td>${activity.action}</td>
            <td>${activity.timestamp?.toDate().toLocaleString() || 'No timestamp'}</td>
            <td class="${statusClass}">${statusDisplay}</td>
            <td>${activity.addedBy}</td>
            <td>${wordDisplay}</td>
            <td>${translatedDisplay}</td>
        `;

        tableBody.appendChild(row);
    });
}
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






document.addEventListener("DOMContentLoaded", loadPendingContent);

    // Logout functionality
    document.getElementById('logoutButton').addEventListener('click', async (event) => {
        event.preventDefault();
        isLoggingOut = true;
        try {
            await signOut(auth);
            alert('You have been logged out successfully.');
            window.location.href = "staff_login.html";
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Error logging out. Please try again.');
        }
    });