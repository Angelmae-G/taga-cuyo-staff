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