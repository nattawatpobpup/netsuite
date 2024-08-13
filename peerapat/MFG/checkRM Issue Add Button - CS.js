define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printRM(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_pp_checkrmiss',
            deploymentId: 'customdeploy_pp_checkrmiss'
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