define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printIF(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_pp_issform',
            deploymentId: 'customdeploy_pp_issform'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printIF:printIF,
    }
})