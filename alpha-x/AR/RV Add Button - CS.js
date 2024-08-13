define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printRV(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_rv',
            deploymentId: 'customdeploy_rv'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printRV:printRV,
    }
})