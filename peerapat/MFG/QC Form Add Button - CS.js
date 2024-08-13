define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printQC(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_pp_qcform',
            deploymentId: 'customdeploy_pp_qcform'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printQC:printQC,
    }
})