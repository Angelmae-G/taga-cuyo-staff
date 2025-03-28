import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc, getDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js"; 
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";


const firebaseConfig = {
    apiKey: "AIzaSyAqr7jav_7l0Y7gIhfTklJXnHPzjAYV8f4",
    authDomain: "taga-cuyo-app.firebaseapp.com",
    projectId: "taga-cuyo-app",
    storageBucket: "taga-cuyo-app.firebasestorage.app",  // ✅ Fixed storage bucket
    messagingSenderId: "908851804845",
    appId: "1:908851804845:web:dff839dc552a573a23a424",
    measurementId: "G-NVSY2HPNX4"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage();
getDownloadURL(ref(storage, 'category_images/example.jpg'))
  .then((url) => {
    imgElement.src = url;
  })
  .catch((error) => {
    console.error("Error fetching image URL:", error);
  });
const storageBucket = "taga-cuyo-app.firebasestorage.app"; 
console.log(storageBucket);

  

let currentUserEmail; 


// Logout functionality


// Auth check and loading categories
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('loginMessage').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        currentUserEmail = user.email; // Store user email

        await loadCategories();
    } else {
        window.location.href = "index.html";
    }
});

window.loadCategories = async function () {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="" disabled selected>- Select a Category -</option>';
    
    const categoriesRef = collection(firestore, 'categories');
    const snapshot = await getDocs(categoriesRef);

    if (!snapshot.empty) {
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.text = doc.data().category_name;
            categorySelect.appendChild(option);
        });
    }
};

window.loadSubcategories = async function (category_id) {
    const subcategorySelect = document.getElementById('subcategorySelect');
    subcategorySelect.innerHTML = '<option value="" disabled selected>- Select a Subcategory -</option>';
    subcategorySelect.disabled = !category_id;

    if (category_id) {
        const subcategoriesRef = collection(firestore, 'categories', category_id, 'subcategories');
        const snapshot = await getDocs(subcategoriesRef);

        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const option = document.createElement("option");
                option.value = doc.id;
                option.text = doc.data().subcategory_name;
                subcategorySelect.appendChild(option);
            });
        }
    }
};

// Fetch words and populate table
window.fetchWords = async function (subcategory_id) {
  const wordsTableBody = document.getElementById('wordsTableBody');
  wordsTableBody.innerHTML = '';

  if (!subcategory_id) return;

  const category_id = document.getElementById('categorySelect').value;
  const wordsRef = collection(firestore, 'categories', category_id, 'subcategories', subcategory_id, 'words');
  const snapshot = await getDocs(wordsRef);

  let rowNumber = 1;
  for (const doc of snapshot.docs) {
      const wordData = doc.data();
      const imageUrl = await getImageUrl(wordData.image_path);

      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${rowNumber++}</td>
          <td contenteditable="false">${wordData.word || 'N/A'}</td>
          <td contenteditable="false">${wordData.translated || 'N/A'}</td>
          <td>
              <ul>
                  ${wordData.options ? wordData.options.map(option => `<li contenteditable="false" class="option">${option}</li>`).join('') : '<li>N/A</li>'}
              </ul>
          </td>
          <td>
              <img src="${imageUrl}" 
                   alt="${wordData.word || 'Image'}" 
                   width="50" height="50" 
                   onclick="openImageModal('${imageUrl}')" 
                   style="cursor: pointer;" />
          </td>
          <td class="action">
              <a href="#" class="edit" data-id="${doc.id}" title="Edit"><i class='bx bxs-pencil'></i></a> |
              <a href="#" class="delete" data-id="${doc.id}" title="Delete"><i class='bx bxs-trash'></i></a>
          </td>
      `;

      wordsTableBody.appendChild(row);
  }

  document.querySelectorAll('.edit').forEach(editBtn => editBtn.addEventListener('click', handleEdit));
  document.querySelectorAll('.delete').forEach(deleteBtn => deleteBtn.addEventListener('click', handleDelete));
};


// Convert Firebase Storage GS path to public URL
const getImageUrl = async (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") {
      console.warn("⚠️ Invalid or missing image path, using placeholder.");
      return 'category_images/example.jpg'; // Ensure this file exists in your project
    }
  
    // Log original image path for debugging
    console.log("Original image path:", imagePath);
  
    // Trim whitespace from the beginning and end (do not remove internal spaces)
    imagePath = imagePath.trim();
  
    console.log("Cleaned image path:", imagePath);
  
    // If it's already a full URL, return it directly
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
  
    // Use the bucket name from firebaseConfig for consistency
    const storageBucket = firebaseConfig.storageBucket; // "taga-cuyo-app.firebasestorage.app"
  
    // Handle GS URLs (e.g., "gs://taga-cuyo-app.firebasestorage.app/category_images/...")
    if (imagePath.startsWith("gs://")) {
      // Remove the "gs://" prefix and bucket name
      const pathWithoutGs = imagePath.replace(`gs://${storageBucket}/`, "");
      return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(pathWithoutGs)}?alt=media`;
    }
  
    // Otherwise, assume it's a relative path stored in Firestore
    return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(imagePath)}?alt=media`;
  };
  



  async function handleEdit(event) {
    event.preventDefault();
    event.stopPropagation();

    const editLink = event.target.closest('.edit');
    if (!editLink || editLink.disabled) return; // Prevent multiple clicks

    editLink.disabled = true; // Disable button to prevent spam

    setTimeout(() => {
        editLink.disabled = false; // Re-enable button after 3 seconds
    }, 3000);

    const row = editLink.closest('tr');
    const wordCell = row.querySelector('td:nth-child(2)');
    const translatedCell = row.querySelector('td:nth-child(3)');
    const optionsCells = Array.from(row.querySelectorAll('.option'));
    const word_id = editLink.dataset.id;
    const category_name = document.getElementById('categorySelect')?.value || "";
    const subcategory_name = document.getElementById('subcategorySelect')?.value || "";
    const isCategoryPage = window.location.pathname.includes("category.html");

    if (!word_id) {
        alert("Missing identifiers. Please ensure all fields are selected.");
        return;
    }

    const isEditing = wordCell.getAttribute("contenteditable") === "true";

    if (isEditing) {
        const updatedWord = wordCell.innerText.trim();
        const updatedTranslation = translatedCell.innerText.trim();
        const updatedOptions = optionsCells.map(opt => opt.innerText.trim());

        if (!updatedWord || !updatedTranslation || updatedOptions.some(opt => !opt)) {
            alert("Please fill in all fields.");
            return;
        }

        // Regular expression: Allow ONLY special characters, disallow spaces and numbers
        const validCharsRegex = /^[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/;
        if (!validCharsRegex.test(updatedWord) || !validCharsRegex.test(updatedTranslation)) {
          alert("Only letters and special characters are allowed. Spaces and numbers are not allowed.");
          return;
      }
      
      if (!updatedOptions.every(option => validCharsRegex.test(option))) {
          alert("Only letters and special characters are allowed in options. Spaces and numbers are not allowed.");
          return;
      }
      

        const originalWord = wordCell.dataset.originalWord;
        const originalTranslation = translatedCell.dataset.originalTranslation;
        const originalOptions = JSON.parse(wordCell.dataset.originalOptions || "[]");

        const hasChanged =
            updatedWord !== originalWord ||
            updatedTranslation !== originalTranslation ||
            JSON.stringify(updatedOptions) !== JSON.stringify(originalOptions);

        if (!hasChanged) {
            alert("No changes detected.");
            return;
        }

        try {
            const wordRef = doc(firestore, 'categories', category_name, 'subcategories', subcategory_name, 'words', word_id);
            const wordDoc = await getDoc(wordRef);

            if (!wordDoc.exists()) {
                throw new Error("Word not found.");
            }

            const wordData = wordDoc.data();
            const imagePath = wordData.image_path || "";

            const activityData = {
                action: 'Edited word in Category',
                addedBy: currentUserEmail,
                timestamp: serverTimestamp(),
                location: isCategoryPage ? 'category' : 'lesson',
                category_name: category_name,
                subcategory_name: subcategory_name,
                oldWord: originalWord,
                newWord: updatedWord,
                word: updatedWord,
                wordId: word_id,
                options: updatedOptions,
                translated: updatedTranslation,
                image_path: imagePath,
                read: false,
                dismissed: false,
                isApprove: false,
                exactLocation: `categories/${category_name}/subcategories/${subcategory_name}/words/${word_id}`
            };

            await Promise.all([
                addDoc(collection(firestore, 'activities'), activityData),
                addDoc(collection(firestore, 'category_activities'), activityData)
            ]);

            alert('Edit request has been submitted for admin approval.');

            // Update the row dynamically without reloading
            wordCell.innerText = updatedWord;
            translatedCell.innerText = updatedTranslation;
            optionsCells.forEach((opt, index) => {
                opt.innerText = updatedOptions[index] || "";
            });

        } catch (error) {
            console.error("Error updating word:", error);
            alert("Failed to submit edit request. Please try again.");
        }

        wordCell.setAttribute("contenteditable", "false");
        translatedCell.setAttribute("contenteditable", "false");
        optionsCells.forEach(opt => opt.setAttribute("contenteditable", "false"));

        wordCell.blur();
        translatedCell.blur();
        optionsCells.forEach(opt => opt.blur());

        editLink.innerHTML = `<i class='bx bxs-pencil'></i>`;

    } else {
        wordCell.setAttribute("contenteditable", "true");
        translatedCell.setAttribute("contenteditable", "true");
        optionsCells.forEach(opt => opt.setAttribute("contenteditable", "true"));

        wordCell.dataset.originalWord = wordCell.innerText.trim();
        translatedCell.dataset.originalTranslation = translatedCell.innerText.trim();
        wordCell.dataset.originalOptions = JSON.stringify(optionsCells.map(opt => opt.innerText.trim()));

        wordCell.focus();
        editLink.innerHTML = `<i class='bx bxs-check-circle'></i>`;
    }
}







// Deletion and logging functions should also use consistent naming for category_name, subcategory_name, etc.


// Deletion and logging functions should also use consistent naming for category_id, subcategory_id, etc.


// Deletion and logging functions should also use consistent naming for lesson_id, subcategory_id, etc.




async function handleDelete(event) {

  event.preventDefault(); // Prevents default link behavior
  event.stopPropagation(); // Stops bubbling

    const deleteLink = event.target.closest('.delete');
    const wordId = deleteLink.dataset.id;
    const category_name = document.getElementById('categorySelect').value;  // Using category_name
    const subcategory_name = document.getElementById('subcategorySelect').value;  // Using subcategory_name
    const isCategoryPage = window.location.pathname.includes("category.html");

    if (confirm("Are you sure you want to delete this word? This action will require admin approval.")) {
        try {
            // Get word data for logging
            const wordDoc = await getDoc(doc(firestore, 'categories', category_name, 'subcategories', subcategory_name, 'words', wordId));
            
            if (!wordDoc.exists()) {
                throw new Error("Word not found.");
            }

            const wordData = wordDoc.data(); 

            // Retrieve relevant fields
            const translated = wordData.translated || '';  
            const word = wordData.word || '';  
            const options = wordData.options || [];  
            const imagePath = wordData.image_path || '';  

            // Construct activity log data
            const activityData = {
                action: 'Deleted word from Category',
                word: word,  
                category_name: category_name,  
                subcategory_name: subcategory_name,  
                addedBy: currentUserEmail,
                timestamp: serverTimestamp(),
                location: 'category',
                image_path: imagePath,  
                options: options,  
                translated: translated,  
                isApprove: false,  
                read: false,
                delete: false,
                type: isCategoryPage ? 'category' : 'lesson',  
                exactLocation: `categories/${category_name}/subcategories/${subcategory_name}/words/${wordId}`,  
            };

            // Log deletion request in both `activities` and `category_activities`
            await Promise.all([
                addDoc(collection(firestore, 'activities'), activityData),
                addDoc(collection(firestore, 'category_activities'), activityData)
            ]);

            alert('Deletion request has been submitted for admin approval.');
            fetchWords(subcategory_name);  // Refresh the words list
        } catch (error) {
            console.error('Error logging deletion request:', error);
            alert('Error submitting deletion request. Please try again.');
        }
    }
}

async function logActivity(actionType, addedBy, details) {
    const activityRef = collection(firestore, 'activities');

    // Prepare the base activity object
    const activityData = {
        action: actionType,
        addedBy: addedBy,
        timestamp: serverTimestamp(), // Ensure serverTimestamp is imported from Firebase
        location: details.type,
    };

    // Add specific fields based on action type
    if (actionType.includes('Edited')) {
        // Log activity details for edits
        activityData.oldWord = details.oldWord || null;
        activityData.newWord = details.newWord || null;
        activityData.exactLocation = `categories/${details.category_name}/subcategories/${details.subcategory_name}/words/${details.newWord || details.oldWord}`;
        activityData.options = details.options || null;
        activityData.translated = details.translated || null;
    } else if (actionType.includes('Deleted')) {
        // Log activity details for deletions
        activityData.word = details.word; // Log the word that was deleted
        activityData.exactLocation = `categories/${details.category_name}/subcategories/${details.subcategory_name}/words/${details.word}`;
    }

    // Add the document to Firestore
    await addDoc(activityRef, activityData);
}






// ... (the rest of your existing code)


// ... (the rest of your existing code)



window.openImageModal = function (imagePath) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");

    if (!imagePath || imagePath.trim() === "") {
        console.warn("Invalid image path. Modal will not open.");
        return; // Prevent opening the modal if no image is provided
    }

    modalImg.src = imagePath;
    modal.style.display = "flex"; // Use flex for centering
};
window.onload = function () {
    document.getElementById("imageModal").style.display = "none";
};


function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}
document.getElementById("closeModal").addEventListener("click", closeModal);

// Attach the function to the window object
window.closeModal = function() {
document.getElementById("imageModal").style.display = "none";
};

// This should now work because closeModal is globally accessible
document.getElementById("closeModal").addEventListener("click", closeModal);

// Event delegation for edit and delete actions
document.getElementById('wordsTableBody').addEventListener('click', function(event) {
    if (event.target.closest('.edit')) {
        handleEdit(event);
    } else if (event.target.closest('.delete')) {
        handleDelete(event);
    }
});



document.addEventListener('DOMContentLoaded', function () {
    const notificationDot = document.getElementById('notificationDot');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationWrapper = document.getElementById('notificationWrapper');
  
    if (!notificationDot || !notificationDropdown || !notificationWrapper) {
      console.error('Notification elements are missing!');
      return;
    }
  
    // **Check unseen notifications on page load**
    checkUnseenNotifications();
  
    // **Listen for notifications**
    listenForNotifications();
  
    // **Handle dropdown click to mark notifications as seen**
    notificationWrapper.addEventListener('click', () => {
      notificationDropdown.classList.toggle('active');
  
      if (notificationDot.style.display === 'block') {
        notificationDot.style.display = 'none'; // Hide red dot
        markNotificationsAsSeen(); // Mark as seen
      }
    });
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
  
  // **Check notification state when the page loads**
  function checkUnseenNotifications() {
    const isSeen = localStorage.getItem('notificationsSeen') === 'true';
    if (isSeen) {
      notificationDot.style.display = 'none'; // Ensure red dot stays hidden if already seen
    }
  }