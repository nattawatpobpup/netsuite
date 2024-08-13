define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printCNVC(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_print_cnvc',
            deploymentId: 'customdeploy_print_cnvc'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printCNVC:printCNVC,
    }
})