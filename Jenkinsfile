pipeline {
  agent any
  options {
    skipStagesAfterUnstable()
  }
  stages {
    stage('Deploy Production') {
      when {
        branch 'master'
      }
      steps {
        sshPublisher(publishers: [sshPublisherDesc(configName: 'UBUNTU SERVER SASTAMALA', transfers: [sshTransfer(cleanRemote: false, excludes: '**/node_modules/**', execCommand: '/home/pi/scripts/pokerpocket_deploy.sh', execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: 'pokerpocket/holdem/backend/', remoteDirectorySDF: false, removePrefix: '', sourceFiles: '/**')], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: true)])
      }
    }
  }
  post {
      success {
        script {
          mail bcc: '', body: "<b>PokerPocket Backend Pipeline</b><br>Project: ${env.JOB_NAME} <br>Build Number: ${env.BUILD_NUMBER} <br> URL de build: ${env.BUILD_URL}", cc: '', charset: 'UTF-8', from: 'norkator@hotmail.com', mimeType: 'text/html', replyTo: '', subject: "PokerPocket Backend CI SUCCESS: ${env.JOB_NAME}", to: "nitramite@outlook.com";
        }
      }
      failure {
        mail bcc: '', body: "<b>PokerPocket Backend Pipeline</b><br>Project: ${env.JOB_NAME} <br>Build Number: ${env.BUILD_NUMBER} <br> URL de build: ${env.BUILD_URL}", cc: '', charset: 'UTF-8', from: 'norkator@hotmail.com', mimeType: 'text/html', replyTo: '', subject: "PokerPocket Backend CI FAILED: ${env.JOB_NAME}", to: "nitramite@outlook.com";
      }
  }
}
