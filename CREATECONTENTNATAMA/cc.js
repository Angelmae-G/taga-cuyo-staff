// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

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


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);  // ✅ Initialize Firestore


let currentUser = null;
let isLoggingOut = false;




// Logout functionality
document.getElementById('logoutButton').addEventListener('click', async (event) => {
    event.preventDefault();
    isLoggingOut = true;

    if (currentUser) {
        const userRef = doc(db, "admins", currentUser.uid);
        await updateDoc(userRef, { isActive: false }); // Set user as inactive on logout
    }

    try {
        await signOut(auth);
        alert('You have been logged out successfully.');
        window.location.href = "staff_login.html";
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
});


onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; // Ensure currentUser is assigned
        console.log("User is signed in:", currentUser.email);
    } else {
        console.log("No user is signed in.");
    }
});

function toggleForm() {
    const selectedValue = document.getElementById("form-select").value;
    document.getElementById("category-form").style.display = selectedValue === "category" ? "block" : "none";
    document.getElementById("lesson-form").style.display = selectedValue === "lesson" ? "block" : "none";
}

// Add event listener to load subcategories based on selected category
document.getElementById('category-select').addEventListener('change', loadSubcategories);

// Load lessons and categories on page load
loadLessons();
loadCategories();

// Function to load categories
async function loadCategories() {
    try {
        const categoriesRef = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesRef);
        const categoryList = document.getElementById('category-select');
        categoryList.innerHTML = '<option value="">-- Select a Category --</option>';

        categorySnapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.category_name || doc.id;
            categoryList.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Function to load lessonsasync function loadLessons() {
try {
    const querySnapshot = await getDocs(collection(db, "lessons"));
    querySnapshot.forEach((doc) => {
        console.log("Lesson:", doc.data());
    });
} catch (error) {
    console.error("Error loading lessons:", error);

}

// ✅ Call this function after the page loads
window.onload = () => {
    loadLessons();
};

// Function to load lessons
async function loadLessons() {
    try {
        const lessonsRef = collection(db, 'lessons');
        const lessonSnapshot = await getDocs(lessonsRef);
        const lessonList = document.getElementById('lesson-select');
        lessonList.innerHTML = '<option value="">-- Select a Lesson --</option>';

        lessonSnapshot.forEach((doc) => {
            const lesson = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `Aralin ${lesson.lesson_id}`; // Prefix with "Aralin" and add lesson_id
            lessonList.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading lessons:", error);
    }
}


// Function to load subcategories
async function loadSubcategories() {
    const categoryId = document.getElementById('category-select').value;
    const subcategoryRef = collection(db, 'categories', categoryId, 'subcategories');
    const subcategorySnapshot = await getDocs(subcategoryRef);
    const subcategoryList = document.getElementById('subcategory-select');
    subcategoryList.innerHTML = '<option value="">-- Select a Subcategory --</option>';

    subcategorySnapshot.forEach((doc) => {
        const subcategory = doc.data();
        const option = document.createElement('option');
        option.value = subcategory.subcategory_name; // Use subcategory_name as the value
        option.textContent = subcategory.subcategory_name;
        subcategoryList.appendChild(option);
    });
}

// Add word to category (approval process for category)
window.addWordToCategory = async function () {
    const categoryId = document.getElementById('category-select').value;
    const subcategory_name = document.getElementById('subcategory-select').value;
    const word = document.getElementById('word-category').value.trim();
    const translated = document.getElementById('translated-category').value.trim();
    const options = Array.from(document.querySelectorAll('.option-input'))
        .map((input) => input.value.trim())
        .filter((option) => option !== "");

    const file = document.getElementById('category-image').files[0];

    if (!categoryId || !subcategory_name || !word || !translated || options.length < 2 || !file) {
        alert('Please fill out all fields and ensure there are at least two options and an image.');
        return;
    }

    try {
        const category_name = await getCategoryName(categoryId);
        const storagePath = `category_images/${category_name}/${subcategory_name}/${file.name}`;

        // Upload image to Firebase Storage
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            null,
            (error) => {
                console.error("Image upload failed:", error);
                alert('Error uploading image. Please try again.');
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                // Prepare data object
                const wordData = {
                    word,
                    translated,
                    options,
                    image_path: downloadURL,
                    addedBy: currentUser.email,
                };

                // Prepare activity data for admin approval
                const activityData = {
                    ...wordData,
                    category_id: categoryId,
                    subcategory_name: subcategory_name,
                    category_name: category_name,
                    type: 'category',
                    action: 'Added word in Category',
                    isApprove: false,
                    timestamp: new Date(),
                };

                // Store in 'activities' collection for admin approval
                const pendingWordRef = collection(firestore, 'activities');
                await addDoc(pendingWordRef, activityData);

                // Add logs to activity collections
                await addDoc(collection(firestore, 'category_activities'), activityData);

                alert('Word added for admin approval.');
                document.getElementById('word-category-form').reset();
                document.getElementById('options-container-category').innerHTML = '';
            }
        );
    } catch (error) {
        console.error("Error adding word to category: ", error);
        alert('Error adding word. Please try again.');
    }
};


// Fetch the category name using its ID
async function getCategoryName(id) {
    try {
        const docRef = doc(db, 'categories', id); // Assuming 'categories' is the Firestore collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().category_name; // Ensure this matches the folder naming convention in Firebase Storage
        }
        throw new Error('Category not found');
    } catch (error) {
        console.error("Error fetching category name:", error);
    }
}




// Add word to lesson (approval process for lesson)
window.addWordToLesson = async function () {
    const lessonId = document.getElementById('lesson-select').value; // Get the selected lesson ID
    const word = document.getElementById('word-lesson').value.trim();
    const translated = document.getElementById('translated-lesson').value.trim();
    const options = Array.from(document.getElementsByClassName('option-field'))
        .map(input => input.value.trim())
        .filter(value => value);

    // Validate input fields
    if (options.length < 2 || !word || !translated) {
        alert("Please complete all fields and add at least two options.");
        return;
    }

    try {
        // Get the lesson number and name using the lesson ID
        const { lesson_number, lesson_name } = await getLessonData(lessonId);

        // Create activity data object
        const activityData = {
            word,
            translated,
            options,
            addedBy: currentUser.email,
            location: 'lesson',
            action: 'Added word in Lesson',
            lesson_id: lesson_number, // Store the lesson number instead of the document ID
            lesson_name: lesson_name, // Store the lesson name
            isApprove: false,
            timestamp: new Date(),
        };

        // Add to 'activities' collection
        await addDoc(collection(db, 'activities'), activityData);

        // Add to 'lesson_activities' collection
        await addDoc(collection(db, 'lesson_activities'), activityData);

        alert('Word added for admin approval.');
        document.getElementById('word-lesson-form').reset();
        document.getElementById('options-container-lesson').innerHTML = '';
    } catch (error) {
        console.error("Error adding word to lesson: ", error);
        alert('Error adding word. Please try again.');
    }
};

// Function to fetch lesson number and name from Firestore
async function getLessonData(id) {
    try {
        const docRef = doc(db, 'lessons', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                lesson_number: docSnap.data().lesson_id, // Fetch lesson number
                lesson_name: docSnap.data().lesson_name // Fetch lesson name
            };
        }
        throw new Error('Lesson not found');
    } catch (error) {
        console.error("Error fetching lesson data:", error);
        return { lesson_number: "N/A", lesson_name: "N/A" };
    }
}




// Add option field to lesson
window.addOptionToLesson = function () {
    const optionsContainer = document.getElementById('options-container-lesson');
    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'option-wrapper';

    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'option-field';
    newOption.placeholder = 'Enter option';

    const removeIcon = document.createElement('i');
    removeIcon.className = 'fas fa-trash';
    removeIcon.style.cursor = 'pointer';
    removeIcon.onclick = () => optionsContainer.removeChild(optionWrapper);

    optionWrapper.append(newOption, removeIcon);
    optionsContainer.appendChild(optionWrapper);
};

// Add option field to category
window.addOptionToCategory = function () {
    const optionsContainer = document.getElementById('options-container-category');
    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'option-wrapper';

    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'option-input';
    newOption.placeholder = 'Enter option';

    const removeIcon = document.createElement('i');
    removeIcon.className = 'fas fa-trash';
    removeIcon.style.cursor = 'pointer';
    removeIcon.onclick = () => optionsContainer.removeChild(optionWrapper);

    optionWrapper.append(newOption, removeIcon);
    optionsContainer.appendChild(optionWrapper);
};

