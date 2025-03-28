checkUnseenNotifications();

// Handle notification dropdown toggle and mark as seen
notificationWrapper.addEventListener('click', () => {
notificationDropdown.classList.toggle('active');
if (notificationDot.style.display === 'block') {
notificationDot.style.display = 'none'; // Hide the red dot
markNotificationsAsSeen(); // Mark notifications as seen
}
});


function markNotificationsAsSeen() {
// Store the "seen" state in localStorage
localStorage.setItem('notificationsSeen', 'true');
console.log('Notifications marked as seen');
}

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