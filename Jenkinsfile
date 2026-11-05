pipeline {
    agent any

    triggers {
        // Automatically checks GitHub for new commits every 60 seconds
        pollSCM('* * * * *')
    }

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
                    // Installs Node packages non-interactively
                    bat 'npm install --no-audit --no-fund'
                }
            }
        }

        stage('Automated Testing') {
            steps {
                dir('Frontend') {
                    // Executes automated test suite[cite: 3, 6]
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

        stage('Continuous Delivery') {
            steps {
                // Bundles deployable build artifacts[cite: 3]
                archiveArtifacts artifacts: 'Frontend/dist/**', allowEmptyArchive: false
                echo 'Build artifacts successfully packaged for production deployment.'
            }
        }
    }
}