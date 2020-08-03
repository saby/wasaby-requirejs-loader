@Library('pipeline') _

def version = '20.5100'

node ('controls') {
    checkout_pipeline("20.5100/bugfix/status")
    run_branch = load '/home/sbis/jenkins_pipeline/platforma/branch/run_branch'
    run_branch.execute('wasaby_requirejs_loader', version)
}