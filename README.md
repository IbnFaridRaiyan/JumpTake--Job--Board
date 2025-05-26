
# JumpTake--API-Based-Job-Board
=======

This web application features resume parsing using Gemini. For employers, it offers job posting, talent pool access, and candidate management. 
The platform has a dual-portal system with separate interfaces for job seekers and employers. Built with React on the frontend and Node.js/Express on the backend, it includes features like company 
profile creation (with Wikipedia integration).

## Project Structure

The project is organized into two main directories: `client` and `server`.

### Client

The `client` directory contains the frontend application built with React.

- **public/index.html**: The main HTML file for the frontend application.
- **public/favicon.ico**: The favicon for the application.
- **src/components/App.js**: The main component that sets up the application structure.
- **src/components/ResumeDropbox.js**: A component that contains a dropdown box for pasting resumes.
- **src/components/Header.js**: A simple header component for the application.
- **src/styles/main.css**: CSS styles for the frontend application.
- **src/index.js**: The entry point for the React application.
- **package.json**: Configuration file for the frontend application.

### Server

The `server` directory contains the backend application built with Node.js and Express.

- **src/controllers/resumeController.js**: Handles incoming resume data and logs it to the console.
- **src/routes/api.js**: Connects the frontend to the resumeController and defines the endpoint for receiving resume data.
- **src/index.js**: The entry point for the backend application.
- **package.json**: Configuration file for the backend application.

## Getting Started

To get started with the project, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the `client` directory and install the dependencies:
   ```
   cd client
   npm install
   ```
3. Navigate to the `server` directory and install the dependencies:
   ```
   cd server
   npm install
   ```
4. Start the backend server:
   ```
   cd server
   npm start
   ```
5. In a new terminal, start the frontend application:
   ```
   cd client
   npm start
   ```

## Usage

Once both the frontend and backend servers are running, you can access the application in your web browser. You will be able to paste your resume into the dropdown box, and the data will be sent to the backend where it will be logged to the console.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.
>>>>>>> 5c4da76 (initial commit)
