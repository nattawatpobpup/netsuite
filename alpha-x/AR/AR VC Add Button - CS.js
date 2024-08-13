define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printARVC(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_print_arvc',
            deploymentId: 'customdeploy_print_arvc'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printARVC:printARVC,
    }
})