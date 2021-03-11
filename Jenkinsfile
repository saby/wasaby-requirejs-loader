@Library('pipeline') _

def version = '21.2000'

node ('controls') {
    checkout_pipeline("21.2000/feature/may/wasaby_requirejs_loader-110321")
    //checkout_pipeline("rc-${version}")
    run_branch = load '/home/sbis/jenkins_pipeline/platforma/branch/run_branch'
    run_branch.execute('wasaby_requirejs_loader', version)
}