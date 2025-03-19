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

        let lessons = [];

        lessonSnapshot.forEach((doc) => {
            const lesson = doc.data();
            if (lesson.lesson_id && lesson.lesson_name) {
                lessons.push({
                    id: parseInt(lesson.lesson_id, 10), // Convert to number for sorting
                    name: lesson.lesson_name,
                    docId: doc.id
                });
            }
        });

        // ✅ Sort lessons by lesson_id (numerically)
        lessons.sort((a, b) => a.id - b.id);

        // ✅ Append sorted lessons to the select dropdown
        lessons.forEach((lesson) => {
            const option = document.createElement('option');
            option.value = lesson.docId;
            option.textContent = `Aralin ${lesson.id} - ${lesson.name}`;
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
    const submitButton = document.getElementById('submit-button'); // Add an ID to your submit button in HTML
    submitButton.disabled = true; // Disable the button

    setTimeout(() => {
        submitButton.disabled = false; // Re-enable after 3 seconds
    }, 3000);

    const categoryId = document.getElementById('category-select').value;
    const subcategory_name = document.getElementById('subcategory-select').value;
    const word = document.getElementById('word-category').value.trim();
    const translated = document.getElementById('translated-category').value.trim();
    const options = Array.from(document.querySelectorAll('.option-input'))
        .map((input) => input.value.trim())
        .filter((option) => option !== "");

    const file = document.getElementById('category-image').files[0];

    // Regular expression to allow only alphabets (both uppercase and lowercase)
    const alphabetRegex = /^[A-Za-z]+$/;

    if (!categoryId || !subcategory_name || !word || !translated || options.length < 2 || !file) {
        alert('Please fill out all fields and ensure there are at least two options and an image.');
        return;
    }

    // Validate that word, translated, and options only contain alphabetic characters
    if (!alphabetRegex.test(word) || !alphabetRegex.test(translated)) {
        alert('Only alphabetic characters are allowed for word and translation.');
        return;
    }

    if (!options.every(option => alphabetRegex.test(option))) {
        alert('Only alphabetic characters are allowed for options.');
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
                    location: 'category',
                    action: 'Added word in Category',
                    isApprove: false,
                    delete: false,
                    dismissed: false,
                    read: false,
                    timestamp: new Date(),
                };

                // Store in 'activities' collection for admin approval
                const pendingWordRef = collection(firestore, 'activities');
                await addDoc(pendingWordRef, activityData);

                // Add logs to activity collections
                await addDoc(collection(firestore, 'category_activities'), activityData);

                alert('Word added for admin approval.');
                document.getElementById('word-category-form').reset();

                // Reset the 3 options (Ensure it stays exactly 3)
                resetOptions();
            }
        );
    } catch (error) {
        console.error("Error adding word to category: ", error);
        alert('Error adding word. Please try again.');
    }
};

// Function to reset the options to exactly 3 after submission
function resetOptions() {
    const optionContainerIds = ['options-container-category', 'options-container-category-2', 'options-container-category-3'];

    optionContainerIds.forEach((id, index) => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<input type="text" class="option-input w-full border border-gray-300 rounded p-2 mb-2" id="option-${index + 1}" name="options[]" placeholder="Enter option" required />`;
        }
    });
}

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
    const lessonId = document.getElementById('lesson-select')?.value; // Get the selected lesson ID
    const word = document.getElementById('word-lesson')?.value.trim();
    const translated = document.getElementById('translated-lesson')?.value.trim();
    const options = Array.from(document.getElementsByClassName('option-input'))
        .map(input => input.value.trim())
        .filter(value => value);

    // Regular expression to allow special characters and spaces, but NOT numbers
    const textRegex = /^[^\d]+$/; // Ensures no numbers are present

    // Validate input fields
    if (!word || !translated || options.length < 2) {
        alert("Please complete all fields and add at least two options.");
        return;
    }

    // Validate that word, translated, and options do NOT contain numbers
    if (!textRegex.test(word) || !textRegex.test(translated)) {
        alert('Numbers are not allowed for word and translation.');
        return;
    }

    if (!options.every(option => textRegex.test(option))) {
        alert('Numbers are not allowed for options.');
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
            delete: false,
            read: false,
            dismissed: false,
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
};




// Add option field to lesson with a remove button
window.addOptionToLesson = function () {
    const optionsContainer = document.getElementById('options-container-lesson');

    // Check if the current number of options is 8
    if (optionsContainer.children.length >= 8) {
        alert('You can only add up to 8 options.');
        return;
    }

    // Create a wrapper for the input and trash icon
    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'flex items-center space-x-2 mb-2';

    // Create input field with the correct styling
    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'option-input w-full border border-gray-300 rounded p-2';
    newOption.name = 'options[]';
    newOption.placeholder = 'Enter option';
    newOption.required = true;

    // Create trash icon (FontAwesome)
    const removeIcon = document.createElement('i');
    removeIcon.className = 'fas fa-trash text-red-500 cursor-pointer';
    removeIcon.onclick = () => {
        optionsContainer.removeChild(optionWrapper);
    };

    // Append input and remove icon to wrapper
    optionWrapper.appendChild(newOption);
    optionWrapper.appendChild(removeIcon);

    // Append wrapper to container
    optionsContainer.appendChild(optionWrapper);
};



// Add option field to category
window.addOptionToCategory = function () {
    const optionsContainer = document.getElementById('options-container-category');
    const optionInputs = optionsContainer.querySelectorAll('.option-input');

    // Ensure there are at most 3 options
    if (optionInputs.length >= 3) {
        alert('You can only have up to 3 options.');
        return;
    }

    const optionWrapper = document.createElement('div');
    optionWrapper.className = 'option-wrapper flex items-center space-x-2';

    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'option-input w-full border border-gray-300 rounded p-2';
    newOption.placeholder = 'Enter option';

    const removeIcon = document.createElement('i');
    removeIcon.className = 'fas fa-trash text-gray-500 cursor-pointer';
    removeIcon.onclick = () => {
        optionsContainer.removeChild(optionWrapper);
    };

    optionWrapper.append(newOption, removeIcon);
    optionsContainer.appendChild(optionWrapper);
};

// Ensure exactly 3 options on page load
document.addEventListener("DOMContentLoaded", function () {
    const optionsContainer = document.getElementById('options-container-category');
    let existingOptions = optionsContainer.querySelectorAll('.option-input').length;

    // Add missing options to make it 3 total
    for (let i = existingOptions; i < 3; i++) {
        const optionWrapper = document.createElement('div');
        optionWrapper.className = 'option-wrapper flex items-center space-x-2';

        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.className = 'option-input w-full border border-gray-300 rounded p-2';
        newOption.placeholder = `Enter option`;

        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-trash text-gray-500 cursor-pointer';
        removeIcon.onclick = () => {
            optionsContainer.removeChild(optionWrapper);
        };

        optionWrapper.append(newOption, removeIcon);
        optionsContainer.appendChild(optionWrapper);
    }
});


