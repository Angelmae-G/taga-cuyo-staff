document.addEventListener("DOMContentLoaded", loadPendingContent);
        document.addEventListener("DOMContentLoaded", loadHistory);
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
        import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";  // Import authentication module

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
        const db = getFirestore(app);
        const auth = getAuth();
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('User is signed in:', user);
            // Proceed with Firestore operations
        } else {
            console.log('No user is signed in.');
        }

    });
    window.approveContent = async function (docId) {
    try {
        const docRef = doc(db, 'activities', docId);
        const docSnapshot = await getDoc(docRef);

        if (!docSnapshot.exists()) {
            console.error("No such document! Unable to update.");
            return;
        }

        const data = docSnapshot.data();
        if (!data) {
            console.error("Document data is undefined or invalid.");
            return;
        }

        const approveButton = document.querySelector(`button.approve-btn[data-doc-id="${docId}"]`);
        const rejectButton = document.querySelector(`button.reject-btn[data-doc-id="${docId}"]`);

        if (data.location === 'lesson' && data.lessonId) {
            // Validate `lessonId`
            const lessonDocRef = doc(db, 'lessons', data.lessonId);
            const lessonDocSnapshot = await getDoc(lessonDocRef);

            if (lessonDocSnapshot.exists()) {
                const lesson_name = lessonDocSnapshot.data().lesson_name || 'N/A';

                const wordsSubcollectionRef = collection(lessonDocRef, 'words');
                await addDoc(wordsSubcollectionRef, {
                    word: data.word,
                    translated: data.translated,
                    options: data.options ? data.options : [],
                    addedBy: data.addedBy,
                    timestamp: new Date(),
                });

                // Update the lesson document
                await updateDoc(lessonDocRef, {
                    lesson_name: lesson_name,
                    isApproved: true,
                    lastUpdated: new Date(),
                });

                // Mark activity as approved
                await updateDoc(docRef, { isApprove: true });
                removeFromPendingContentTable(docId);
                loadHistory();
            } else {
                console.error("Lesson does not exist! Unable to add word.");
                return;
            }
        } else if (data.location === 'category' && data.categoryId && data.subcategoryId) {
            // Validate `categoryId` and `subcategoryId`
            const categoryDocRef = doc(db, 'categories', data.categoryId);
            const subcategoryDocRef = doc(categoryDocRef, 'subcategories', data.subcategoryId);
            const subcategoryDocSnapshot = await getDoc(subcategoryDocRef);

            if (subcategoryDocSnapshot.exists()) {
                const wordsSubcollectionRef = collection(subcategoryDocRef, 'words');
                await addDoc(wordsSubcollectionRef, {
                    word: data.word,
                    translated: data.translated,
                    options: data.options ? data.options : [],
                    image_path: data.image_path || null,
                    addedBy: data.addedBy,
                    timestamp: new Date(),
                });

                // Update the subcategory document
                await updateDoc(subcategoryDocRef, {
                    isApproved: true,
                    lastUpdated: new Date(),
                });

                // Mark activity as approved
                await updateDoc(docRef, { isApprove: true });
                removeFromPendingContentTable(docId);
                loadHistory();
            } else {
                console.error("Subcategory does not exist! Unable to add word.");
                return;
            }
        } else {
            console.error("Invalid location or missing required IDs.");
            return;
        }

        // Log the approval action in history
        await addDoc(collection(db, 'history'), {
            action: data.location === 'lesson' ? 'Added a word in lesson' : 'Added a word in category',
            addedBy: data.addedBy,
            lessonId: data.lessonId || data.categoryId,
            documentId: docId,
            contentDetails: `Word: ${data.word} <br> Translated: ${data.translated} <br> Options: ${
                data.options ? data.options.join(', ') : 'No options available'
            }`,
            adminAction: 'Added content',
            timestamp: new Date(),
        });

        // Remove from Pending Content Table
        removeFromPendingContentTable(docId);
        loadHistory(); // Reload history table
    } catch (error) {
        console.error("Error in approveContent:", error);
    }
};

window.rejectContent = async function(docId) { 
    const docRef = doc(db, 'activities', docId);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const contentDetails = `Word: ${data.word} <br> Translated: ${data.translated} <br> Options: ${data.options ? data.options.join(', ') : 'No options available'}`;

        if (data.location === 'lesson' && data.lessonId) {
            // Handling lesson content rejection
            const lessonDocRef = doc(db, 'lessons', data.lessonId);
            const lessonDocSnapshot = await getDoc(lessonDocRef);

            if (lessonDocSnapshot.exists()) {
                const wordsCollectionRef = collection(lessonDocRef, 'words');
                const wordSnapshot = await getDocs(wordsCollectionRef);

                // Iterate over words and delete matching word
                await Promise.all(wordSnapshot.docs.map(async (wordDoc) => {
                    const wordData = wordDoc.data();
                    if (wordData.word === data.word) {
                        await deleteDoc(wordDoc.ref);
                        console.log(`Deleted word: ${data.word} from lesson.`);
                    }
                }));
                 // Remove from Pending Content Table
    removeFromPendingContentTable(docId);
            }
        } else if (data.location === 'category' && data.categoryId && data.subcategoryId) {
            // Handling category content rejection
            const categoryDocRef = doc(db, 'categories', data.categoryId);
            const subcategoryDocRef = doc(categoryDocRef, 'subcategories', data.subcategoryId);
            const wordsCollectionRef = collection(subcategoryDocRef, 'words');
            const wordSnapshot = await getDocs(wordsCollectionRef);

            // Iterate over words and delete matching word in subcategory
            await Promise.all(wordSnapshot.docs.map(async (wordDoc) => {
                const wordData = wordDoc.data();
                if (wordData.word === data.word) {
                    await deleteDoc(wordDoc.ref);
                    console.log(`Deleted word: ${data.word} from category subcategory.`);
                }
            }));
            removeFromPendingContentTable(docId);
        }
      
        loadHistory();  // Reload history table for updated view

       // Log the rejection action in history
await addDoc(collection(db, 'history'), {
    action: data.location === 'lesson' ? 'Deleted a word in lesson' : 'Deleted a word from category',
    addedBy: data.addedBy || 'Unknown',  // Use 'Unknown' if addedBy is undefined
    lessonId: data.location === 'lesson' ? data.lessonId : data.categoryId,  // Log lessonId only if it's a lesson
    categoryId: data.location === 'category' ? data.categoryId : null, // Log categoryId if it's a category
    subcategoryId: data.location === 'category' ? data.subcategoryId : null, // Log subcategoryId if it's a category
    documentId: docId,
    contentDetails: `Word: ${data.word} <br> Translated: ${data.translated} <br> Options: ${data.options ? data.options.join(', ') : 'No options available'}`,
    adminAction: 'Deleted content',  // Describes the action taken
    timestamp: new Date(),
});

        // Update the document in the 'activities' collection to mark it as approved
await updateDoc(docRef, { isApprove: true });

console.log(`Marked content with docId: ${docId} as approved in activities.`);

        // Remove from Pending Content Table and reload history
        removeFromPendingContentTable(docId);
        loadHistory();  // Reload history table for updated view
    } else {
        console.error("Document does not exist in activities collection. Unable to reject.");
    }
};
window.dismissContent = async function(docId) { 
    console.log("Action dismissed. No changes made to the database.");
    const docRef = doc(db, 'activities', docId);
    const docSnapshot = await getDoc(docRef);

    // Ensure the document exists before proceeding
    if (!docSnapshot.exists()) {
        console.error("No such document! Unable to dismiss.");
        return;  // This return statement is now inside the function, which is correct.
    }

    // Extract the type from the document data (assumed to be available)
    const data = docSnapshot.data();
    const type = data.location === 'lesson' ? 'lesson' : 'category';  // Define 'type' based on document location

    try {
        await updateDoc(docRef, {
            isApprove: false,
            dismissed: true,
            contentType: type  // Use the defined 'type' (lesson or category)
        });
        alert('Content dismissed.');
    } catch (error) {
        console.error("Error dismissing content:", error);
        alert('Error dismissing content.');
    }

    const contentDetails = `Word: ${data.word} <br> Translated: ${data.translated} <br> Options: ${data.options ? data.options.join(', ') : 'No options available'}`;

    // Store dismissed content in localStorage
    let dismissedContent = JSON.parse(localStorage.getItem('dismissedContent')) || [];
    dismissedContent.push(docId);
    localStorage.setItem('dismissedContent', JSON.stringify(dismissedContent));

    // Remove the row from the pending content table
    const row = document.querySelector(`tr[data-doc-id="${docId}"]`);
    if (row) {
        alert('It has been dismissed! No changes made!');
        row.remove();
    }

    // Log the dismissal action in history
    await addDoc(collection(db, 'history'), {
        action: 'Dismissed content',
        addedBy: data.addedBy || 'Unknown',
        lessonId: data.location === 'lesson' ? data.lessonId : data.categoryId,
        documentId: docId,
        contentDetails: contentDetails,
        adminAction: 'Dismissed content',
        timestamp: new Date(),
    });

    // Reload history table (if applicable)
    loadHistory();
};

function removeFromPendingContentTable(docId) {
    const row = document.querySelector(`tr[data-doc-id="${docId}"]`);
    if (row) {
        row.remove();
    }
}

        let pendingContentCache = [];
        
        window.editWordContent = async function(docId, documentId, location, lessonId, categoryId) {
    try {
        // Handling lesson update (editing and approving the content)
        if (location === 'lesson') {
            const lessonDocRef = doc(db, 'lessons', lessonId); // Corrected: used lessonId instead of data.lessonId
            const lessonDocSnapshot = await getDoc(lessonDocRef);

            if (lessonDocSnapshot.exists()) {
                const wordsSubcollectionRef = collection(lessonDocRef, 'words'); // Reference to the 'words' subcollection
                const wordDocRef = doc(wordsSubcollectionRef, docId); // Reference to the specific word document

                // Check if document exists before updating
                const wordDocSnapshot = await getDoc(wordDocRef);
                if (wordDocSnapshot.exists()) {
                    // Update the word document (ensure 'approved' and 'edited' fields exist)
                    await updateDoc(wordDocRef, {
                        edited: true,  // Flag to indicate the word has been edited
                    });

                    console.log(`Word with ID ${docId} approved and updated successfully in lesson ${lessonId}`);

                    // Log the approval action in history
                    await addDoc(collection(db, 'history'), {
                        action: 'Approved and edited word in lesson',
                        addedBy: 'admin', // Adjust if needed to reflect who edited it
                        lessonId: lessonId, // Store lessonId from document
                        categoryId: null,
                        subcategoryId: null,
                        documentId: docId,
                        contentDetails: `Word ID: ${docId} approved and updated.`,
                        adminAction: 'Approved content',
                        timestamp: new Date(),
                    });
                } else {
                    console.error(`Word document with ID ${docId} not found in lesson.`);
                }
            } else {
                console.error('Lesson not found.');
            }
        }

        // Handling category update (editing and approving the content)
        if (location === 'category') {
            const categoryDocRef = doc(db, 'categories', categoryId); // Reference to the category document
            const categoryDocSnapshot = await getDoc(categoryDocRef);

            if (categoryDocSnapshot.exists()) {
                const subcategoryDocRef = doc(categoryDocRef, 'subcategories', docId); // Reference to the subcategory
                const wordCollectionRef = collection(subcategoryDocRef, 'words'); // Reference to the 'words' subcollection
                const wordDocRef = doc(wordCollectionRef, docId); // Reference to the specific word document

                // Check if document exists before updating
                const wordDocSnapshot = await getDoc(wordDocRef);
                if (wordDocSnapshot.exists()) {
                    // Update the word document (ensure 'approved' and 'edited' fields exist)
                    await updateDoc(wordDocRef, {
                        approved: true,  // Marking as approved
                        edited: true,  // Flag to indicate the word has been edited
                    });

                    console.log(`Word with ID ${docId} approved and updated successfully in category ${categoryId}`);

                    // Log the approval action in history
                    await addDoc(collection(db, 'history'), {
                        action: 'Approved and edited word in category',
                        addedBy: 'admin', // Adjust if needed
                        lessonId: null,
                        category_name: categoryId, // Store categoryId from document
                        subcategory_name: docId, // Store subcategoryId (docId)
                        documentId: docId,
                        contentDetails: `Word ID: ${docId} approved and updated.`,
                        adminAction: 'Approved content',
                        timestamp: new Date(),
                    });
                } else {
                    console.error(`Word document with ID ${docId} not found in category.`);
                }
            } else {
                console.error('Category not found.');
            }
        }
    } catch (error) {
        console.error('Error in editing word content:', error);
    }
};

    async function loadPendingContent() {
    const activitiesSnapshot = await getDocs(
        query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc')
        )
    );

    // Store pending content data in cache
    pendingContentCache = [];
    const tableBody = document.getElementById('pendingContentTableBody');
    tableBody.innerHTML = '';

    const dismissedContent = JSON.parse(localStorage.getItem('dismissedContent')) || [];

    for (const docSnapshot of activitiesSnapshot.docs) {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;

        // Skip dismissed content or approved content
        if (dismissedContent.includes(docId) || data.isApprove) {
            continue;
        }

        let lesson_name = 'N/A';
        let lessonId = data.lessonId || 'N/A';

        if (data.location === 'lesson' && data.lessonId) {
            // For lessons, retrieve lesson name
            const lessonDocRef = doc(db, 'lessons', data.lessonId);
            const lessonDocSnapshot = await getDoc(lessonDocRef);

            if (lessonDocSnapshot.exists()) {
                lesson_name = lessonDocSnapshot.data().lesson_name || 'N/A';
            }
        } else if (data.location === 'category' && data.category_name) {
            // For categories, retrieve category and subcategory names
            lessonId = data.categoryId; // Use categoryId in place of lessonId

            const categoryDocRef = doc(db, 'categories', data.category_name);
            const categoryDocSnapshot = await getDoc(categoryDocRef);

            if (categoryDocSnapshot.exists()) {
                const categoryData = categoryDocSnapshot.data();
                lesson_name = data.subcategory_name || 'N/A'; // Display subcategory name if available
            }
        }
        const contentDetails = `
        Word: ${data.word} <br>
        Translated: ${data.translated} <br>
        Options: ${data.options ? data.options.join(', ') : 'No options available'} <br>
    `;
        // Conditionally display buttons based on the action type
        let actionButtons;
        if (data.action === 'Added word in Lesson' || data.action === 'Added word in Category') {
            actionButtons = `
                <button class="approve-btn" data-doc-id="${docId}" onclick="approveContent('${docId}')">Add</button>
                <button class="dismiss-btn" data-doc-id="${docId}" onclick="dismissContent('${docId}')">Dismiss</button>`;
        } else if (data.action === 'Deleted word from Lesson' || data.action === 'Delete word from Category')  {
            actionButtons = `
                <button class="reject-btn" data-doc-id="${docId}" onclick="rejectContent('${docId}')">Delete</button>
                <button class="dismiss-btn" data-doc-id="${docId}" onclick="dismissContent('${docId}')">Dismiss</button>`;
        } else if (data.action === 'Edited word in Lesson'|| data.action === 'Edited word in Category') {
            actionButtons = `
                <button class="edit-btn" data-doc-id="${docId}" data-word-id="${data.wordId}" onclick="editWordContent('${docId}', '${data.wordId}')">Edit</button>
                <button class="dismiss-btn" data-doc-id="${docId}" onclick="dismissContent('${docId}')">Dismiss</button>`;
        } else {
            console.log("Unknown action:", data.action);
            actionButtons = `<button class="dismiss-btn" data-doc-id="${docId}" onclick="dismissContent('${docId}')">Dismiss</button>`;
        }

        const row = document.createElement('tr');
        const imageColumn = `<td><img src="${data.image_path || 'No image available'}" width="100" onclick="openModal('${data.image_path}')"></td>`;

        row.setAttribute('data-doc-id', docId);
        row.innerHTML = `
            <td>${lessonId}</td>
            <td>${lesson_name}</td>
            <td>${contentDetails}</td>
              ${imageColumn}  <!-- Image in its own column -->
            <td style="text-align: center;">${data.action || 'No action made'}</td>
            <td style="text-align: center;">${data.timestamp.toDate().toLocaleString()}</td>
            <td style="text-align: center;" class="status-pending">Pending</td>
            <td>${data.addedBy}</td>
            <td>${actionButtons}</td>
        `;

        tableBody.appendChild(row);
        pendingContentCache.push({ docId, data });
    }
}

    async function loadHistory() {
        const historySnapshot = await getDocs(
            query(
                collection(db, 'history'),
                orderBy('timestamp', 'desc')
            )
        );

        const historyTableBody = document.getElementById('historyTableBody');
        historyTableBody.innerHTML = '';

        for (const historyDoc of historySnapshot.docs) {
            const data = historyDoc.data();
            const row = document.createElement('tr');

            // Apply background color based on adminAction
            if (data.adminAction === 'Deleted content') {
                row.style.backgroundColor = 'red'; // For deleted content
            } else if (data.adminAction === 'Approved content') {
                row.style.backgroundColor = 'green'; // For approved content
            } else if (data.adminAction === 'Edited content') {
                row.style.backgroundColor = 'green'; // For edited content
            } else if (data.adminAction === 'Dismissed content') {
                row.style.backgroundColor = 'gray'; // For dismissed content
            }

            row.innerHTML = `
                <td>${data.timestamp.toDate().toLocaleString()}</td>
                <td>${data.addedBy}</td>
                <td>${data.documentId}</td>
                <td>${data.lessonId}</td>
                <td>${data.contentDetails}</td>
                <td>${data.action}</td>
                <td>${data.adminAction}</td>
            `;
            historyTableBody.appendChild(row);
        }
    }

        document.addEventListener("DOMContentLoaded", loadHistory);