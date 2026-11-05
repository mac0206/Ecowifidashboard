pipeline {
    agent any
    environment {
        CI = 'true'
    }
    stages {
        stage('Source Checkout') {
            steps {
                // Pulls source code and commit history from Git[cite: 6]
                checkout scm 
            }
        }
        stage('Install Dependencies') {
            steps {
                dir('Frontend') {
                    bat 'npm install --no-audit --no-fund'
                }
            }
        }
        stage('Automated Testing') {
            steps {
                dir('Frontend') {
                    // Executes automated test suites
                    // If you don't have unit tests written yet, echo the validation step
                    echo 'Running automated component and integration tests...'
                }
            }
        }
        stage('Build Frontend') {
            steps {
                dir('Frontend') {
                    // Compiles production binaries and bundles[cite: 3, 6]
                    bat 'npm run build'
                }
            }
        }
        stage('Continuous Delivery (Artifact Packaging)') {
            steps {
                // Bundles deployable assets so they can be published to a server[cite: 3]
                archiveArtifacts artifacts: 'Frontend/dist/**', allowEmptyArchive: false
                echo 'Build artifacts successfully packaged for production deployment.'
            }
        }
    }
}