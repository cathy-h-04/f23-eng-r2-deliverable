"use client";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/schema";
import Image from "next/image";
type Species = Database["public"]["Tables"]["species"]["Row"];
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useForm} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// We use zod (z) to define a schema for the "Add species" form.
// zod handles validation of the input values with methods like .string(), .nullable(). It also processes the form inputs with .transform() before the inputs are sent to the database.
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

const speciesSchema = z.object({
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission
    .transform((val) => (val?.trim() === "" ? null : val?.trim())),
  description: z
    .string()
    .nullable()
    .transform((val) => (val?.trim() === "" ? null : val?.trim())),
  kingdom: kingdoms,
  // endangered: z.boolean().optional(),
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  total_population: z.number().int().positive().min(1).optional(),
  image: z
    .string()
    .url()
    .nullable()
    .transform((val) => val?.trim()),
});

type FormData = z.infer<typeof speciesSchema>;

export default function SpeciesCard(species: Species) {

  const router = useRouter();
  const [learnMore, setLearnMore] = useState<boolean>(false);
  const [author, setAuthor] = useState<String>("");
  const [email, setEmail] = useState<String>("");
  const [editted, setEdit] = useState<boolean>(false);
  const [speciesData, setSpeciesData] = useState<Species | null>(null); // Initialize as null, stores fetched species data. 
  const [defaultData, setDefaultData] = useState<Species | null>(null); // Initialize as null, stores fetched species data.
  
  let storedId : string = "";

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    mode: "onChange",
  });

  const onClick = async () => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>();
    // fetches species based on Scientific name. 
    const { data, error } = await supabase
      .from("species")
      .select("*")
      .eq("scientific_name", species.scientific_name) 
      .single(); 
    
    if (error) {
      return toast({
        title: "Species not represented in database.",
        description: error.message,
        variant: "destructive",
      });
    }
    const { data: authorData, error: authorError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.author) // Join using species table's author as foreign key
    .single();

    if (authorError) {
      return toast({
        title: "No record of author",
        description: authorError.message,
        variant: "destructive",
      });
    }
    else
    {
      const user_info = {
        data, 
        author: authorData.display_name,
        email: authorData.email
      }
      setSpeciesData(data); // storing in species struct
      setAuthor(user_info.author) //storing in author variable
      setEmail(user_info.email) //storing in email variable
      setLearnMore(true); // Show the dialog
    }
    return data;
  };

  const onEdit = async () => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>()

    const {data: currentId, error: authentication} = await supabase.auth.getUser()

    if (authentication)
    {
      return toast({
        title: "Authentication failed.",
        description: authentication.message,
        variant: "destructive",
      })
    }
    else{
      storedId = currentId.user.id;
    }
    
    const { data: returnedspecies, error: specieserror } = await supabase
      .from('species')
      .select('*')
      .eq('author', storedId)
      .eq('scientific_name', species.scientific_name)
      .single(); // Specify the ID of the species to edit
    
    if (specieserror) {
        return toast({
          title: "You must author the entry to change it.",
          description: specieserror.message,
          variant: "destructive",
        })
    }
    else 
    {
      setDefaultData(returnedspecies); // Store the retrieved data
      setEdit(true); // Show the dialog
    }
    return specieserror;
  }


  const onSubmit = async (input: FormData) => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>();

    const {data: currentId, error: authentication} = await supabase.auth.getUser()

    if (authentication)
    {
      return toast({
        title: "Authentication failed.",
        description: authentication.message,
        variant: "destructive",
      })
    }
    if (await onEdit()) //another reminder that they can not submit. 
    {
      return toast({
        title: "Can not modify other people's entries.",
        variant: "destructive",
      })
    }

    const {data, error} = await supabase
      .from('species')
      .update({
        author: currentId.user.id,
        common_name: defaultData?.common_name,
        description: input.description,
        kingdom: input.kingdom,
        // endangered: input.endangered,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq('scientific_name', input.scientific_name); 

    if (error) {
      return toast({
        title: "Could not update species.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Reset form values to the data values that have been processed by zod.
    // This way the user sees any changes that have occurred during transformation
    form.reset(input);
    setEdit(false);
    router.refresh();
    };

  return (
    <div className="min-w-72 m-4 w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{species.common_name}</h3>
      <h4 className="text-lg font-light italic">{species.scientific_name}</h4>
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>
      {/* Replace with detailed view */}
      <Dialog open={learnMore} onOpenChange={setLearnMore}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full" onClick={onClick}>Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detailed View</DialogTitle>
          <DialogDescription>
          {speciesData && (
                  <>
                    <p>Scientific Name: {speciesData.scientific_name}</p>
                    <p>Common Name: {speciesData.common_name}</p>
                    <p>Total Population: {speciesData.total_population}</p>
                    <p>Kingdom: {speciesData.kingdom}</p>
                    {/* <p>Endangered: {speciesData.endangered ? 'Yes' : 'No'}</p> */}
                    <p>Description: {speciesData.description}</p>
                    <p>Author: {author}</p>
                    <p>Email: {email}</p>
                  </>
                )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    <Dialog open={editted} onOpenChange={setEdit}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full" onClick={onEdit}>Edit Species</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Species</DialogTitle>
          <DialogDescription>
                    <p>Fill out the fields to edit the species information. </p>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input placeholder={defaultData?.scientific_name}{...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""}  placeholder={defaultData?.common_name || undefined} {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    {/* Using shadcn/ui form with enum: https://github.com/shadcn-ui/ui/issues/772 */}
                    <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={defaultData?.kingdom}  />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom, index) => (
                            <SelectItem key={index} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <FormField
                control={form.control}
                name="endangered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endangered</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "true")} defaultValue={field.value ? 'true' : 'false'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="True or false" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={"true"}>True</SelectItem>
                          <SelectItem value={"false"}>False</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
                /> */}
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total population</FormLabel>
                    <FormControl>
                      {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                      <Input
                        type="number"
                        placeholder="300000"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          value={value ?? ""}
                          placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="flex">
                <Button type="submit" className="ml-1 mr-1 flex-auto">
                  Edit Species
                </Button>
                <Button
                  type="button"
                  className="ml-1 mr-1 flex-auto"
                  variant="secondary"
                  onClick={() => setEdit(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </div>
  );
}




