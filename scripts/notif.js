// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import { getFirestore, query, where, collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.firebasestorage.app",
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};

document.addEventListener('DOMContentLoaded', function () {
  const notificationDot = document.getElementById('notificationDot');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationWrapper = document.getElementById('notificationWrapper');
  
  if (!notificationDot || !notificationDropdown || !notificationWrapper) {
  console.error('Notification elements are missing!');
  return;
  }
  
  // Check for unseen notifications on page load
  checkUnseenNotifications();
  
  // Handle notification dropdown toggle and mark as seen
  notificationWrapper.addEventListener('click', () => {
  notificationDropdown.classList.toggle('active');
  if (notificationDot.style.display === 'block') {
  notificationDot.style.display = 'none'; // Hide the red dot
  markNotificationsAsSeen(); // Mark notifications as seen
  }
  });
  
  // Listen for new notifications in real-time
  listenForNotifications();
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
  
  snapshot.forEach((doc) => {
  const data = doc.data();
  console.log('Document Data:', data);
  console.log(notificationDot.style.display)
  
  // Ensure isApprove exists and is true for the notification to show
  if (data.isApprove !== null && data.isApprove) {
  hasNewNotifications = true;
  
  let redirectLink = '#';
  if (data.action.includes('Added word in Lesson')) {
    redirectLink = 'lesson.html';
  } else if (data.action.includes('Added word in Category')) {
    redirectLink = 'category.html';
  }
  
  notifications.push(`
    <p>
      <a href="${redirectLink}" class="notification-link">
        <strong>Action:</strong> ${data.action} <br>
        <strong>Added By:</strong> ${data.addedBy} <br>
        <strong>Status:</strong> ${data.isApprove ? 'Accepted' : 'Pending'} <br>
      </a>
    </p>
    <hr>
  `);
  }
  });
  
  // Sort notifications by timestamp (if timestamps are available)
  notifications.sort((a, b) => b.timestamp - a.timestamp);
  
  // Update the notification dropdown content
  const dropdownContent = notifications.length
  ? notifications.join('')
  : '<p>No new notifications</p>';
  notificationDropdown.innerHTML = dropdownContent;
  
  // Show red dot if there are new notifications and they haven't been seen
  const notificationsSeen = localStorage.getItem('notificationsSeen') === 'true';
  if (hasNewNotifications && !notificationsSeen) {
  notificationDot.style.display = 'block'; // Show the red dot
  }
  });
  }
  
  function checkUnseenNotifications() {
  const isSeen = localStorage.getItem('notificationsSeen') === 'true';
  notificationDot.style.display = isSeen ? 'none' : 'block'; // Show or hide based on localStorage
  }
  