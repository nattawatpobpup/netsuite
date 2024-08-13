define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printRM(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_pp_checkrm',
            deploymentId: 'customdeploy_pp_checkrm'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printRM:printRM,
    }
})