pipeline {
    agent any
    stages {
        stage('Source Checkout') {
            steps {
                // Pulls source code and commit history from the Git repository[cite: 6]
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                // Installs packages in the root directory
                bat 'npm install'
                
                // Installs packages specifically in the Frontend directory
                dir('Frontend') {
                    bat 'npm install'
                }
            }
        }
        stage('Build Frontend') {
            steps {
                // Compiles the React/TypeScript portal[cite: 6]
                dir('Frontend') {
                    bat 'npm run build'
                }
            }
        }
    }
}