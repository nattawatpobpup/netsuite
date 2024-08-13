define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printWOC(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_pp_wocform',
            deploymentId: 'customdeploy_pp_wocform'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printWOC:printWOC,
    }
})