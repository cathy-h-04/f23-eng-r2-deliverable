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

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Session } from '@supabase/supabase-js';

console.log("HELLOOOOO");

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

  const [learnMore, setLearnMore] = useState<boolean>(false);
  const [submitted, setSubmit] = useState<boolean>(false);
  const [editted, setEdit] = useState<boolean>(false);
  const [speciesData, setSpeciesData] = useState<Species | null>(null); // Initialize as null, stores fetched species data. 
  const [defaultData, setDefaultData] = useState<Species | null>(null); // Initialize as null, stores fetched species data.
  const [sessionData, setSessionData] = useState<string>();

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
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }
    else
    {
      setSpeciesData(data); // Store the retrieved data
      setLearnMore(true); // Show the dialog
    }
    return data;
  };

  const onEdit = async () => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>()

    const {data: currentId, error: authentication} = await supabase.auth.getUser()

    console.log("NOW HERE IT IS.")
    console.log(typeof(currentId))

    if (authentication)
    {
      return toast({
        title: "You did not author this entry.",
        description: authentication.message,
        variant: "destructive",
      })
    }
    else{
      setSessionData(currentId.user.id); 
      console.log(sessionData);
    }
    
    const { data, error } = await supabase
      .from('species')
      .select('*')
      .eq('author', sessionData)
      .eq('scientific_name', species.scientific_name)
      .single(); // Specify the ID of the species to edit

    if (error) {
        return toast({
          title: "You did not author this entry.",
          description: error.message,
          variant: "destructive",
        })
    }
    else 
    {
      setDefaultData(data); // Store the retrieved data
      setEdit(true); // Show the dialog
    }
    return data;
  }


  const onSubmit = async (input: FormData) => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>();
    const router = useRouter();

    const { error} = await supabase
      .from('species')
      .update({
        author: sessionData,
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq('scientific_name', input.scientific_name); // Specify the ID of the species to edit

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Reset form values to the data values that have been processed by zod.
    // This way the user sees any changes that have occurred during transformation
      form.reset(input);
      setSubmit(true);

      // Refresh all server components in the current route. This helps display the newly created species because species are fetched in a server component, species/page.tsx.
      // Refreshing that server component will display the new species from Supabase
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
                    <p>Description: {speciesData.description}</p>
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
        
        </Form>
      </DialogContent>
    </Dialog>
    </div>
  );
}




