require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Job = require('../models/Job');
const Company = require('../models/Company');


const sampleJobs = [
    {
        title: 'Software Engineer',
        description: 'We are looking for a skilled software engineer with experience in React and Node.js to join our development team. The ideal candidate will have 3+ years of experience building web applications and a strong understanding of modern JavaScript frameworks.',
        location: 'San Francisco, CA',
        salary: '$120,000 - $150,000',
        jobType: 'Full-time',
        requirements: [
            'Bachelor\'s degree in Computer Science or related field',
            '3+ years experience with React and Node.js',
            'Experience with modern JavaScript frameworks',
            'Strong problem-solving skills'
        ],
        responsibilities: [
            'Develop new user-facing features using React.js',
            'Build reusable components and front-end libraries for future use',
            'Optimize components for maximum performance',
            'Collaborate with the design team to implement UI/UX features'
        ],
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'HTML/CSS']
    },
    {
        title: 'Data Scientist',
        description: 'Join our data team to analyze complex datasets and build predictive models. You\'ll work with large datasets to extract insights and develop algorithms that power our products.',
        location: 'Remote',
        salary: '$110,000 - $140,000',
        jobType: 'Full-time',
        requirements: [
            'Master\'s or PhD in Statistics, Computer Science, or related field',
            'Experience with machine learning frameworks (TensorFlow, PyTorch)',
            'Proficiency in Python and data analysis libraries',
            'Experience with SQL and database systems'
        ],
        responsibilities: [
            'Develop machine learning models to solve business problems',
            'Process, clean, and verify the integrity of data used for analysis',
            'Present findings to stakeholders and recommend solutions',
            'Collaborate with engineering teams to implement models'
        ],
        skills: ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'Data Analysis']
    },
    {
        title: 'UX/UI Designer',
        description: 'We\'re seeking a creative UX/UI Designer to craft intuitive and engaging user experiences for our products. You\'ll be responsible for the look and feel of our applications, ensuring they\'re both visually appealing and user-friendly.',
        location: 'New York, NY',
        salary: '$90,000 - $120,000',
        jobType: 'Full-time',
        requirements: [
            'Bachelor\'s degree in Design, HCI, or related field',
            'Portfolio demonstrating strong UI/UX skills',
            'Experience with design tools (Figma, Sketch, Adobe XD)',
            'Understanding of user-centered design principles'
        ],
        responsibilities: [
            'Create wireframes, prototypes, and high-fidelity mockups',
            'Conduct user research and usability testing',
            'Collaborate with product managers and developers',
            'Develop and maintain design systems'
        ],
        skills: ['UI Design', 'UX Design', 'Figma', 'Wireframing', 'Prototyping']
    }
];

const seedJobs = async () => {
    try {
      
        await connectDB();
        
        console.log('Connected to MongoDB');
        
        
        const company = await Company.findOne();
        
        if (!company) {
            console.log('No companies found. Please create a company first.');
            process.exit(1);
        }
        
        console.log(`Using company: ${company.name} (${company._id})`);
        
     
        await Job.deleteMany({});
        console.log('Deleted existing jobs');
        
     
        const jobsWithCompany = sampleJobs.map(job => ({
            ...job,
            company: company._id
        }));
        
        await Job.insertMany(jobsWithCompany);
        console.log(`${jobsWithCompany.length} sample jobs created successfully`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding jobs:', error);
        process.exit(1);
    }
};

seedJobs();