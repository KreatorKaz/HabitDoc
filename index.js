//Interface of the user
    // the User will see a calendar
    // there will be a post button
    // the post button leads to an add habit page
    // the habit will have name, desciription, repeat function, and proof type, start date
    // the habit will go on the corrusponding date and fill on all the repeated tabs
    // you can post, patch, delete habits like the blog post website


// My plan to make this
    // I am going to get all the days of the current month, each month will be an h1 or some foreach function in EJS
    // Then I will use a array for each day, that is inside a month array
    // There will be a create habit button that goes to another page
    // there will be 4 feilds, habit name, date start, repeating type, Documentation. 
    // this will then fill under the date and under each repeating one
    // CLICK ON THe check to document it in the certain type, I will keep it camera right now, or something I am capable of
    // click on another button to patch and there will bea  delete buttion on the after the patch button

// create a daily habit tracker where you can input text
    // it will have day top left
    // habittracker top right
    //habits center
    // list of habits for the day below
    // check on the left of each habit to complete it, goes to seperate page
    // center is the text and submit button

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import env from "dotenv";
import session from 'cookie-session';
import bcrypt from 'bcrypt';

const app = express();
const port = process.env.PORT || 3000;
const salt = 10;
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

env.config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,    // Used to sign/encrypt the session ID cookie
    resave: false,                // Prevents saving unchanged sessions
    saveUninitialized: true,      // Creates a session even if it's empty initially
    cookie: { secure: false }     // Send cookie over HTTP in development; set secure: true for HTTPS in production
  }));

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

db.connect();

function todayDate(){
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
    return formattedDate
}

function todayDateTime() {
    const today = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    
    const formattedDate = today.toLocaleDateString('en-US', dateOptions);
    const formattedTime = today.toLocaleTimeString('en-US', timeOptions);
    
    return `${formattedDate} at ${formattedTime}`;
}

function dayOfTheWeek(){
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayColumns = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayColumn = dayColumns[dayOfWeek];
    return dayColumn
}

function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Format options
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

    return `${formattedDate}, ${formattedTime}`;
}

function checkAuthenticaton (req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.render('register.ejs')
    }
}

app.post("/register", async (req,res) => {
    const username = req.body.username
    const email = req.body.email
    
    const password = req.body.password
    const hashPassword = await bcrypt.hash(password, salt)
    
    try {    
        await db.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [username, email, hashPassword])
        
        const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username])
        const user = result.rows[0]
        req.session.user = {
            id: user.id
        }

        res.redirect("/")

    } catch (err) {
        res.send('User already exists, try again.')
    }
    
})

app.post('/login', async (req,res) => {
    const username = req.body.username
    const password = req.body.password

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username])
        const user = result.rows[0]
        const comparePassword = await bcrypt.compare(password, user.password)
        if (comparePassword) {
            req.session.user = {
                id: user.id
            }
            res.redirect("/")
        } else {
            res.send('Incorrect password. Try again')
        }
    } catch (err) {
        res.send('user does not exist. Try again or register.') 
    }
})

app.get("/", checkAuthenticaton, async (req,res) => {
    const user = req.session.user.id
    const sundayHabits = await db.query(`SELECT * FROM habits WHERE sunday = TRUE AND user_id = $1`, [user]);
    const mondayHabits = await db.query(`SELECT * FROM habits WHERE monday = TRUE AND user_id = $1`, [user]);
    const tuesdayHabits = await db.query(`SELECT * FROM habits WHERE tuesday = TRUE AND user_id = $1`, [user]);
    const wednesdayHabits = await db.query(`SELECT * FROM habits WHERE wednesday = TRUE AND user_id = $1`, [user]);
    const thursdayHabits = await db.query(`SELECT * FROM habits WHERE thursday = TRUE AND user_id = $1`, [user]);
    const fridayHabits = await db.query(`SELECT * FROM habits WHERE friday = TRUE AND user_id = $1`, [user]);
    const saturdayHabits = await db.query(`SELECT * FROM habits WHERE saturday = TRUE AND user_id = $1`, [user]);


    const currentDay = todayDate();
    res.render("index.ejs",{ 
        date: currentDay, 
        sundayHabits: sundayHabits.rows, 
        mondayHabits: mondayHabits.rows,
        tuesdayHabits: tuesdayHabits.rows,
        wednesdayHabits: wednesdayHabits.rows,
        thursdayHabits: thursdayHabits.rows,
        fridayHabits: fridayHabits.rows,
        saturdayHabits: saturdayHabits.rows
    })
})

app.get("/habit/:id", async (req,res) => {
    const habitId = req.params.id;
    const habitResult = await db.query('SELECT * FROM habits WHERE habit_id = $1', [habitId])
    const imageData = await db.query('select * from documentation where habit_id = $1', [habitId])
    const date = todayDate()
    res.render("habit.ejs",{habit: habitResult.rows[0], date: date, images: imageData.rows.map(row => ({
        id: row.img_id, 
        data: row.image_data,
        timestamp: formatDate(row.timestamp)
    }))})
})

app.post("/addhabit", async (req,res) =>{
    const user = req.session.user.id
    const newHabit = req.body.habit_name;
    let selectedDays = req.body.days_of_week; // This will be an array of selected days

    try {
        await db.query('INSERT INTO habits (habit_name, user_id) VALUES ($1, $2)', [newHabit, user])
        if (!Array.isArray(selectedDays)) {
            selectedDays = [selectedDays]; // Wrap the single string in an array
        }
        // Ensure selectedDays is an array
        if (selectedDays && Array.isArray(selectedDays)) {
            for (const day of selectedDays) {
                // Update the corresponding day column to TRUE for the new habit
                await db.query(`UPDATE habits SET ${day} = TRUE WHERE habit_name = $1 AND user_id = $2`, [newHabit, user]);
            }
        }
    
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding habit");
    }    
})

app.post('/edit/:id', async (req,res) => {
    const habit = req.params.id
    const habitResult = await db.query('SELECT * FROM habits WHERE habit_id = $1', [habit])
    res.render("edit.ejs", {habit: habitResult.rows[0]})
})

app.post("/edithabit/:id", async (req,res) =>{
    const editId = req.params.id
    const editHabit = req.body.habit_name;
    let selectedDays = req.body.days_of_week;// This will be an array of selected days
    const allDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    let unselectedDays = allDays.filter(day => !selectedDays.includes(day));

    try {
        await db.query('update habits set habit_name = $1 where habit_id = $2 ', [editHabit, editId])
        if (!Array.isArray(selectedDays)) {
            selectedDays = [selectedDays]; // Wrap the single string in an array
        }
        if (!Array.isArray(unselectedDays)) {
            unselectedDays = [unselectedDays]; // Wrap the single string in an array
        }
        // Ensure selectedDays is an array
        if (selectedDays && Array.isArray(selectedDays)) {
            for (const day of selectedDays) {
                // Update the corresponding day column to TRUE for the new habit
                await db.query(`UPDATE habits SET ${day} = TRUE WHERE habit_name = $1`, [editHabit]);
            }
        
        }
        if (unselectedDays && Array.isArray(unselectedDays)) {
            for (const day of unselectedDays) {
                // Update the corresponding day column to TRUE for the new habit
                await db.query(`UPDATE habits SET ${day} = FALSE WHERE habit_name = $1`, [editHabit]);
            }
        
        }
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding habit");
    }    
})

app.post("/habit/:id/delete", async (req, res) => {
    const habitId = req.params.id;
    await db.query('delete from habits where habit_id = $1',[habitId])
    res.redirect("/")
});

app.post('/upload/:id', upload.single('image'), async (req,res) => {
    const habitId = req.params.id
    const timeStamp = todayDateTime()
    let image;

    // If the user uploaded a file
    if (req.file) {
        image = req.file.buffer.toString('base64');
    }

    // If the user took a picture using the camera
    if (req.body.capturedImage) {
        image = req.body.capturedImage; // This is the Base64 string
    }

    if (!image) {
        return res.status(400).send('No image uploaded.');
    }

    try {
        // Insert the image into the database
        await db.query(
            'INSERT INTO documentation (habit_id, image_data) VALUES ($1, $2)',
            [habitId, image] // Use the image buffer as the binary data
        );

        // Redirect to the habit page after successful upload
        res.redirect(`/habit/${habitId}`);
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send('Error uploading image');
    }
})

app.post('/capture/:id', async (req,res) =>{
    const habitId = req.params.id
    const habitResult = await db.query('SELECT * FROM habits WHERE habit_id = $1', [habitId])
    res.render("upload.ejs", { habit: habitResult.rows[0]})
})

app.post('/deleteImage/:imageId/habit/:habitId', async (req,res) => {
    const imageId = req.params.imageId
    const habitId = req.params.habitId
    try {
        // Delete the image from the documentation table
        await db.query('DELETE FROM documentation WHERE img_id = $1', [imageId]); // Use the correct column name (id)
        res.redirect(`/habit/${habitId}`); // Redirect back to the habit page
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send('Error deleting image');
    }
})

app.post('/back', (req,res) => {
    res.redirect("/")
})

app.post('/add', (req,res) => {
    res.render("add.ejs")
})

app.post('/logout', (req,res) => {
    req.session.destroy()
    res.redirect('/')
}) 

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});